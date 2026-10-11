import process from "node:process";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const projectRef = "qdmriiokeindzgeokvqj";
const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !secretKey || !token) {
  console.error("Identifiants Supabase manquants dans .env.local");
  process.exit(1);
}

const adminClient = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function querySql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Database error: ${JSON.stringify(data)}`);
  }
  return data;
}

const NEW_ADMIN_EMAIL = "admin777@gmail.com";
const NEW_ADMIN_PASSWORD = "Boss229@2027";

async function main() {
  console.log("================================================================");
  console.log("SUPPRESSION TOTALE DES UTILISATEURS ET CRÉATION DE L'ADMIN UNIQUE");
  console.log("================================================================\n");

  // 1. Vider le stockage (KYC, preuves de dépôts, contrats...)
  console.log("1. Nettoyage des fichiers de stockage (Storage)...");
  try {
    const { listAllStorageFiles, purgeBucketBatches } =
      await import("./../src/lib/admin/storage-crawler.js").catch(
        () => import("./../src/lib/admin/storage-crawler.ts"),
      );
    const files = await listAllStorageFiles(adminClient);
    if (files.length > 0) {
      console.log(`- ${files.length} fichiers trouvés dans le stockage, suppression...`);
      await purgeBucketBatches(adminClient, files);
      console.log("- Tous les fichiers de stockage ont été supprimés.");
    } else {
      console.log("- Aucun fichier restant dans le stockage.");
    }
  } catch (err) {
    console.warn("Avertissement nettoyage storage API:", err.message);
  }

  // 2. Nettoyage SQL complet des tables transactionnelles et profils
  console.log("\n2. Purge SQL des tables dépendantes et des profils...");
  const purgeSql = `
    BEGIN;
    SELECT set_config('app.privileged', 'on', true);

    -- Supprimer les conversations et messages support
    DELETE FROM public.support_messages;
    DELETE FROM public.support_tickets;
    DELETE FROM public.support_conversations;

    -- Supprimer les données financières et prêts
    DELETE FROM public.amortization_schedules;
    DELETE FROM public.loan_contracts;
    DELETE FROM public.loan_request_documents;
    DELETE FROM public.repayment_requests;
    DELETE FROM public.deposit_requests;
    DELETE FROM public.withdrawal_requests;
    DELETE FROM public.loans;
    DELETE FROM public.loan_requests;

    -- Supprimer les notifications et consentements
    DELETE FROM public.notifications;
    DELETE FROM public.notification_outbox;
    DELETE FROM public.pin_reset_challenges;
    DELETE FROM public.user_consents;
    DELETE FROM public.data_erasure_requests;

    -- Supprimer les pièces KYC et portefeuilles
    DELETE FROM public.kyc_documents;
    DELETE FROM public.kyc_financials;
    DELETE FROM public.wallets;

    -- Nettoyer les reçus clients et références
    DELETE FROM app_private.client_command_receipts;
    UPDATE public.notification_templates SET updated_by = NULL WHERE updated_by IS NOT NULL;

    -- Vider l'audit logs pour lever toute contrainte FK résiduelle
    DELETE FROM public.audit_logs;

    -- Vider toutes les sessions actives
    DELETE FROM auth.sessions;
    DELETE FROM auth.refresh_tokens;

    -- Vider tous les profils
    DELETE FROM public.profiles;

    COMMIT;
  `;

  await querySql(purgeSql);
  console.log("Purge SQL réussie.");

  // 3. Supprimer tous les utilisateurs dans auth.users
  console.log("\n3. Suppression de tous les comptes auth GoTrue / auth.users...");
  const { data: authUsersData, error: listAuthError } = await adminClient.auth.admin.listUsers();
  if (listAuthError) {
    throw new Error(`Erreur listUsers: ${listAuthError.message}`);
  }

  console.log(`Nombre d'utilisateurs auth trouvés : ${authUsersData.users.length}`);
  for (const u of authUsersData.users) {
    console.log(`- Suppression de l'utilisateur ${u.email} (${u.id})...`);
    const { error: delErr } = await adminClient.auth.admin.deleteUser(u.id);
    if (delErr) {
      console.warn(`Erreur API deleteUser pour ${u.id}:`, delErr.message);
    }
  }

  // Nettoyage final direct de auth.users si des comptes résiduels subsistaient
  await querySql(`DELETE FROM auth.users;`);
  console.log("Tous les utilisateurs auth ont été supprimés.");

  // 4. Créer le nouvel accès administrateur
  console.log(`\n4. Création du compte administrateur : ${NEW_ADMIN_EMAIL}...`);
  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email: NEW_ADMIN_EMAIL,
    password: NEW_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      firstname: "Admin",
      lastname: "Principal",
    },
    app_metadata: {
      user_role: "admin",
      account_active: true,
    },
  });

  if (createError) {
    throw new Error(`Erreur lors de la création de l'admin: ${createError.message}`);
  }

  const newAdminId = createData.user.id;
  console.log(`Admin créé avec succès dans auth.users (ID: ${newAdminId})`);

  // 5. Configurer le profil administrateur avec privilèges
  console.log("\n5. Configuration du rôle 'admin' et activation dans public.profiles...");
  const setupAdminSql = `
    BEGIN;
    SELECT set_config('app.privileged', 'on', true);

    -- Mettre à jour le profil créé par le trigger on_auth_user_created
    UPDATE public.profiles
    SET
      role = 'admin',
      is_active = true,
      firstname = 'Admin',
      lastname = 'Principal',
      updated_at = now()
    WHERE id = '${newAdminId}';

    -- S'assurer que les métadonnées auth contiennent bien user_role et account_active
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || '{"user_role": "admin", "account_active": true}'::jsonb
    WHERE id = '${newAdminId}';

    -- Journaliser l'initialisation de l'administrateur
    INSERT INTO public.audit_logs (
      user_id, user_role, action_type, target_id, new_value, reason
    ) VALUES (
      '${newAdminId}',
      'admin',
      'ADMIN_BOOTSTRAP',
      '${newAdminId}',
      jsonb_build_object('email', '${NEW_ADMIN_EMAIL}', 'role', 'admin', 'is_active', true),
      'Initialisation du compte administrateur unique'
    );

    COMMIT;
  `;

  await querySql(setupAdminSql);
  console.log("Profil administrateur configuré avec succès.");

  // 6. Test d'authentification et validation des claims
  console.log("\n6. Test de connexion avec les identifiants créés...");
  const clientAuth = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: loginData, error: loginError } = await clientAuth.auth.signInWithPassword({
    email: NEW_ADMIN_EMAIL,
    password: NEW_ADMIN_PASSWORD,
  });

  if (loginError || !loginData.session) {
    throw new Error(`Échec de connexion du nouvel admin: ${loginError?.message}`);
  }

  console.log("Connexion réussie !");
  console.log("- Access Token généré avec succès.");

  const { data: claimsData, error: claimsError } = await clientAuth.auth.getClaims();
  if (claimsError) {
    console.warn("Avertissement lecture claims:", claimsError.message);
  } else {
    console.log("- Claims app_metadata :", claimsData?.claims?.app_metadata);
  }

  // 7. Vérifications finales dans la base
  console.log("\n7. État final de la base de données :");
  const usersCheck = await adminClient.auth.admin.listUsers();
  console.log(`- Nombre total d'utilisateurs auth : ${usersCheck.data.users.length}`);

  const profilesCheck = await querySql(
    `SELECT id, firstname, lastname, role, is_active FROM public.profiles;`,
  );
  console.log("- Profils enregistrés :", profilesCheck);

  console.log("\n================================================================");
  console.log("OPÉRATION TERMINÉE AVEC SUCCÈS !");
  console.log(`Email Admin        : ${NEW_ADMIN_EMAIL}`);
  console.log(`Mot de passe Admin : ${NEW_ADMIN_PASSWORD}`);
  console.log(`Rôle               : admin (Actif)`);
  console.log("================================================================");
}

main().catch((err) => {
  console.error("\nERREUR FATALE :", err);
  process.exit(1);
});

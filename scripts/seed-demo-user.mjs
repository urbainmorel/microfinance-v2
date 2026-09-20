import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !secretKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "client.demo@azari.dev";
const DEMO_PASSWORD = "AzariDemo2026!";
const DEMO_PIN = "1234";

async function main() {
  console.log("--- Initialisation de l'utilisateur de démonstration ---");

  // 1. Rechercher si l'utilisateur existe déjà
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error("Erreur listUsers:", listError);
    process.exit(1);
  }

  let user = listData.users.find((u) => u.email === DEMO_EMAIL);

  if (!user) {
    console.log("Création du compte utilisateur auth:", DEMO_EMAIL);
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        firstname: "Moussa",
        lastname: "Traoré",
      },
    });

    if (createError) {
      console.error("Erreur createUser:", createError);
      process.exit(1);
    }
    user = createData.user;
    console.log("Compte auth créé avec succès. ID:", user.id);
  } else {
    console.log("Utilisateur auth existant trouvé. ID:", user.id);
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        firstname: "Moussa",
        lastname: "Traoré",
      },
    });
    if (updateError) {
      console.error("Erreur mise à jour utilisateur auth:", updateError);
    }
  }

  // 2. Mettre à jour le profil
  console.log("Mise à jour des informations de profil...");
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      firstname: "Moussa",
      lastname: "Traoré",
      phone: "+221771234567",
      country: "Sénégal",
      city: "Dakar",
      address: "Avenue Léopold Sédar Senghor, Plateau",
      profession: "Commerçant Import-Export",
      monthly_income_estimate: 750000,
      id_type: "CNI",
      id_number: "SN-1029384756",
      birth_date: "1988-06-15",
      is_active: true,
      role: "client",
    })
    .eq("id", user.id);

  if (profileError) {
    console.error("Erreur profil:", profileError);
  } else {
    console.log("Profil mis à jour avec succès.");
  }

  // 3. Valider le KYC via la procédure officielle auto_process_kyc
  console.log("Validation du KYC...");
  const { error: kycError } = await adminClient.rpc("auto_process_kyc", {
    p_client_id: user.id,
    p_decision: "VALIDATE",
    p_reason: "Compte démo pré-validé pour tests des prêts",
    p_report: {
      source: "demo_seeder",
      decision: "VALIDATE",
      status: "COMPLETED",
      verified_at: new Date().toISOString(),
    },
  });

  if (kycError) {
    console.error("Erreur auto_process_kyc:", kycError);
  } else {
    console.log("Statut KYC validé avec succès (COMPLETED) !");
  }

  // 4. Mettre à jour le solde du wallet (0 FCFA d'épargne libre par défaut)
  console.log("Initialisation du wallet à 0 FCFA d'épargne...");
  const { error: walletError } = await adminClient
    .from("wallets")
    .update({
      free_savings: 0,
    })
    .eq("client_id", user.id);

  if (walletError) {
    console.error("Erreur wallet:", walletError);
  } else {
    console.log("Wallet configuré à 0 FCFA d'épargne libre.");
  }

  // 5. Configuration du code PIN via l'Edge Function set-pin
  console.log("Configuration du code PIN (1234)...");
  const userClient = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (authError || !authData.session) {
    console.error("Erreur de connexion client:", authError);
  } else {
    const { data: pinData, error: pinError } = await userClient.functions.invoke("set-pin", {
      body: { pin: DEMO_PIN },
    });

    if (pinError) {
      console.log("Réponse PIN (déjà configuré ou autre):", pinError.message);
    } else {
      console.log("Code PIN configuré avec succès :", pinData);
    }
  }

  // 6. Vérification de l'état d'onboarding
  const { data: checkState, error: stateError } = await adminClient
    .from("profiles")
    .select("id, firstname, lastname, kyc_status, is_active, role")
    .eq("id", user.id)
    .single();

  console.log("\n=== UTILISATEUR DEMO PRÊT ===");
  console.log("Email       :", DEMO_EMAIL);
  console.log("Mot de passe:", DEMO_PASSWORD);
  console.log("Code PIN    :", DEMO_PIN);
  console.log("Statut KYC  :", checkState?.kyc_status);
  console.log("Solde Épargne: 0 FCFA");
  console.log("=============================\n");
}

main().catch(console.error);

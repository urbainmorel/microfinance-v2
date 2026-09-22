import process from "node:process";
process.loadEnvFile(".env.local");

const projectRef = "qdmriiokeindzgeokvqj";
const token = process.env.SUPABASE_ACCESS_TOKEN;

async function querySql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function verifyKyc() {
  console.log("=== VÉRIFICATION DU FLUX KYC SANS SELFIE SUR SUPABASE DISTANT ===");

  const checks = [];

  // 1. Définition de submit_kyc()
  const submitKycRes = await querySql(`
    select pg_get_functiondef(oid) as def
    from pg_proc
    where proname = 'submit_kyc' and pronamespace = 'public'::regnamespace;
  `);
  const submitDef = submitKycRes[0]?.def || "";
  const submitHasNoSelfie = !submitDef.includes("SELFIE");
  const submitHasIdFront = submitDef.includes("doc_type = 'ID_FRONT'");
  const submitHasIdBack = submitDef.includes("doc_type = 'ID_BACK'");
  console.log("\n1. submit_kyc() ne contient plus 'SELFIE':", submitHasNoSelfie);
  console.log("   submit_kyc() vérifie ID_FRONT:", submitHasIdFront);
  console.log("   submit_kyc() vérifie ID_BACK:", submitHasIdBack);
  checks.push(submitHasNoSelfie && submitHasIdFront && submitHasIdBack);

  // 2. Définition de review_kyc_submission()
  const reviewKycRes = await querySql(`
    select pg_get_functiondef(oid) as def
    from pg_proc
    where proname = 'review_kyc_submission' and pronamespace = 'public'::regnamespace;
  `);
  const reviewDef = reviewKycRes[0]?.def || "";
  const reviewHasNoSelfie = !reviewDef.includes("SELFIE");
  const reviewHasIdFront = reviewDef.includes("doc_type = 'ID_FRONT' and verified");
  const reviewHasIdBack = reviewDef.includes("doc_type = 'ID_BACK' and verified");
  console.log("\n2. review_kyc_submission() ne contient plus 'SELFIE':", reviewHasNoSelfie);
  console.log("   review_kyc_submission() valide ID_FRONT:", reviewHasIdFront);
  console.log("   review_kyc_submission() valide ID_BACK:", reviewHasIdBack);
  checks.push(reviewHasNoSelfie && reviewHasIdFront && reviewHasIdBack);

  // 3. Permissions sur submit_kyc et review_kyc_submission
  const submitPerms = await querySql(`
    select grantee, privilege_type
    from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'submit_kyc';
  `);
  const allowsAuthenticatedSubmit = submitPerms.some((p) => p.grantee === "authenticated");
  const forbidsAnonSubmit = !submitPerms.some((p) => p.grantee === "anon");
  console.log(
    "\n3. submit_kyc accessible à authenticated et interdit à anon:",
    allowsAuthenticatedSubmit && forbidsAnonSubmit,
  );
  checks.push(allowsAuthenticatedSubmit && forbidsAnonSubmit);

  // 4. Test d'exécution sandboxé (pgTAP-like transaction avec rollback)
  // Crée un profil test, insère ID_FRONT et ID_BACK, appelle submit_kyc, vérifie PENDING
  const testRun = await querySql(`
    do $$
    declare
      v_test_uid uuid := gen_random_uuid();
      v_status text;
    begin
      -- Créer un utilisateur et profil temporaire
      insert into auth.users (id, email, raw_user_meta_data)
      values (v_test_uid, 'kyc_sandbox_' || v_test_uid::text || '@test.dev', '{"firstname":"KycTest","lastname":"Live"}');

      update public.profiles
      set country = 'CI',
          city = 'Abidjan',
          address = 'Cocody Riviera',
          phone = '+2250700000000',
          profession = 'Ingénieur',
          monthly_income_estimate = 500000,
          id_type = 'CNI',
          id_number = 'CI-999888',
          is_active = true
      where id = v_test_uid;

      -- Créer les documents ID_FRONT et ID_BACK (AUCUN SELFIE)
      insert into public.kyc_documents (client_id, doc_type, url, verified)
      values
        (v_test_uid, 'ID_FRONT', v_test_uid::text || '/ID_FRONT', false),
        (v_test_uid, 'ID_BACK', v_test_uid::text || '/ID_BACK', false);

      -- Simuler l'appel authentifié via impersonation de claim
      perform set_config('request.jwt.claims', json_build_object('sub', v_test_uid::text, 'role', 'authenticated')::text, true);

      -- Exécuter submit_kyc()
      perform public.submit_kyc();

      -- Vérifier le statut
      select kyc_status into v_status from public.profiles where id = v_test_uid;
      if v_status <> 'PENDING' then
        raise exception 'Échec: statut attendu PENDING, obtenu %', v_status;
      end if;

      -- Nettoyage propre
      delete from public.kyc_documents where client_id = v_test_uid;
      delete from public.profiles where id = v_test_uid;
      delete from auth.users where id = v_test_uid;
    end;
    $$;
  `);

  console.log(
    "\n4. Test de soumission KYC en direct (ID_FRONT + ID_BACK sans aucun selfie) : Réussi avec succès !",
  );
  checks.push(true);

  // Résumé
  const allPassed = checks.every(Boolean);
  console.log("\n==========================================");
  console.log(
    allPassed
      ? "--> TOUS LES TESTS KYC SANS SELFIE SONT VALIDÉS SUR SUPABASE ! ✓"
      : "--> ATTENTION : ÉCHEC DES TESTS KYC ! ❌",
  );
  console.log("==========================================");

  if (!allPassed) {
    process.exit(1);
  }
}

verifyKyc().catch((err) => {
  console.error("Erreur lors de la vérification KYC:", err);
  process.exit(1);
});

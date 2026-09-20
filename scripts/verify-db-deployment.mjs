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

async function verifyDeployment() {
  console.log("=== VÉRIFICATION DU DÉPLOIEMENT DE LA BASE DE DONNÉES ===");

  const checks = [];

  // 1. Colonnes de app_settings
  const appSettingsCols = await querySql(`
    select column_name, data_type, column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'app_settings'
    and column_name in ('auto_loan_approval', 'platform_name');
  `);
  console.log("\n1. Colonnes app_settings:", appSettingsCols);
  checks.push(appSettingsCols.some((c) => c.column_name === "auto_loan_approval"));
  checks.push(appSettingsCols.some((c) => c.column_name === "platform_name"));

  // 2. Définition de app_private.credit_wallet (vérification de ROW_COUNT)
  const creditWalletDef = await querySql(`
    select pg_get_functiondef(oid) as def
    from pg_proc
    where proname = 'credit_wallet' and pronamespace = 'app_private'::regnamespace;
  `);
  const cwDef = creditWalletDef[0]?.def || "";
  const usesRowCount = cwDef.includes("row_count") && !cwDef.includes("if not found then");
  console.log("\n2. app_private.credit_wallet utilise ROW_COUNT:", usesRowCount);
  checks.push(usesRowCount);

  // 3. Surcharges de create_loan_request (doit être unique)
  const createLoanOverloads = await querySql(`
    select proname, pg_get_function_arguments(oid) as args
    from pg_proc
    where proname = 'create_loan_request' and pronamespace = 'public'::regnamespace;
  `);
  console.log(
    "\n3. Surcharges de create_loan_request (Attendu: exactement 1):",
    createLoanOverloads,
  );
  checks.push(createLoanOverloads.length === 1);

  // 4. Permissions sur create_loan_request (doit être accordé uniquement à service_role)
  const createLoanPerms = await querySql(`
    select grantee, privilege_type
    from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'create_loan_request';
  `);
  console.log("\n4. Permissions create_loan_request:", createLoanPerms);
  const allowsServiceRole = createLoanPerms.some((p) => p.grantee === "service_role");
  const forbidsAnon = !createLoanPerms.some((p) => p.grantee === "anon");
  const forbidsPublic = !createLoanPerms.some((p) => p.grantee === "PUBLIC");
  checks.push(allowsServiceRole && forbidsAnon && forbidsPublic);

  // 5. Définition de app_private.generate_loan_contract (ne doit pas contenir disbursementMethod)
  const genContractDef = await querySql(`
    select pg_get_functiondef(oid) as def
    from pg_proc
    where proname = 'generate_loan_contract' and pronamespace = 'app_private'::regnamespace;
  `);
  const gcDef = genContractDef[0]?.def || "";
  const noDisbursementMethod = !gcDef.includes("disbursementMethod");
  console.log("\n5. generate_loan_contract exempt de disbursementMethod:", noDisbursementMethod);
  checks.push(noDisbursementMethod);

  // 6. RLS sur toutes les tables du schéma public
  const tablesWithoutRls = await querySql(`
    select tablename
    from pg_tables
    where schemaname = 'public'
    and rowsecurity = false;
  `);
  console.log(
    "\n6. Tables publiques sans RLS (Attendu: aucune table métier sensible):",
    tablesWithoutRls,
  );
  // Seules les tables de référence sans données sensibles ou spatial_ref_sys peuvent ne pas avoir RLS
  const sensitiveTablesNoRls = tablesWithoutRls.filter((t) =>
    [
      "wallets",
      "loans",
      "loan_requests",
      "loan_contracts",
      "profiles",
      "kyc_verifications",
    ].includes(t.tablename),
  );
  checks.push(sensitiveTablesNoRls.length === 0);

  // 7. create_client_withdrawal (vérification du verrouillage strict sans garantie)
  const ccwDef = await querySql(`
    select pg_get_functiondef(oid) as def
    from pg_proc
    where proname = 'create_client_withdrawal' and pronamespace = 'public'::regnamespace;
  `);
  const ccwCode = ccwDef[0]?.def || "";
  const hasStrictGating = ccwCode.includes("GUARANTEE_REQUIRED_BEFORE_WITHDRAWAL");
  console.log("\n7. create_client_withdrawal intègre le verrouillage strict:", hasStrictGating);
  checks.push(hasStrictGating);

  // 8. get_active_loan_status (withdrawableAmount = 0 si garantie non satisfaite)
  const galsDef = await querySql(`
    select pg_get_functiondef(oid) as def
    from pg_proc
    where proname = 'get_active_loan_status' and pronamespace = 'public'::regnamespace;
  `);
  const galsCode = galsDef[0]?.def || "";
  const hasGalsZeroWithdrawable =
    galsCode.includes("else 0") && galsCode.includes("v_guar_satisfied");
  console.log(
    "\n8. get_active_loan_status impose 0 FCFA retirable sans garantie:",
    hasGalsZeroWithdrawable,
  );
  checks.push(hasGalsZeroWithdrawable);

  // 9. sign_loan_contract (envoi de loan_guarantee_required)
  const slcDef = await querySql(`
    select pg_get_functiondef(oid) as def
    from pg_proc
    where proname = 'sign_loan_contract' and pronamespace = 'public'::regnamespace;
  `);
  const slcCode = slcDef[0]?.def || "";
  const hasLoanGuaranteeNotif = slcCode.includes("loan_guarantee_required");
  console.log(
    "\n9. sign_loan_contract déclenche la notification de garantie:",
    hasLoanGuaranteeNotif,
  );
  checks.push(hasLoanGuaranteeNotif);

  // 10. Template email loan_guarantee_required
  const templateCheck = await querySql(`
    select slug, language, subject
    from public.notification_templates
    where slug = 'loan_guarantee_required';
  `);
  console.log("\n10. Template notification_templates loan_guarantee_required:", templateCheck);
  checks.push(templateCheck.length > 0 && templateCheck[0]?.slug === "loan_guarantee_required");

  // Résumé
  const allPassed = checks.every(Boolean);
  console.log("\n==========================================");
  console.log(
    allPassed
      ? "--> TOUTES LES VÉRIFICATIONS SONT AU VERT ! ✓"
      : "--> ATTENTION : CERTAINS CONTRÔLES ONT ÉCHOUÉ ! ❌",
  );
  console.log("==========================================");

  if (!allPassed) {
    process.exit(1);
  }
}

verifyDeployment().catch((err) => {
  console.error("Erreur d'audit:", err);
  process.exit(1);
});

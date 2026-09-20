import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "client.demo@azari.dev";

async function testModes() {
  console.log("=== TEST DE BOUT EN BOUT : MODES D'APPROBATION DE PRÊT ===\n");

  // 1. Récupérer l'utilisateur démo
  const { data: listData } = await adminClient.auth.admin.listUsers();
  const user = listData.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) throw new Error("Utilisateur démo introuvable");

  // 2. Récupérer un produit de prêt actif
  const { data: product } = await adminClient
    .from("loan_products")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (!product) throw new Error("Aucun produit de prêt actif");
  console.log("Produit utilisé :", product.name, "(ID:", product.id, ")");

  // Nettoyage de prêts en cours éventuels
  await adminClient.from("loans").delete().eq("client_id", user.id);
  await adminClient.from("loan_contracts").delete().eq("client_id", user.id);
  await adminClient.from("loan_requests").delete().eq("client_id", user.id);
  await adminClient.from("wallets").update({ disbursed_loan: 0 }).eq("client_id", user.id);

  // -------------------------------------------------------------
  // TEST A : MODE MANUEL (auto_loan_approval = false)
  // -------------------------------------------------------------
  console.log("\n--- [1] Test du MODE MANUEL ---");
  await adminClient.from("app_settings").update({ auto_loan_approval: false }).eq("id", true);

  const keyManual = crypto.randomUUID();
  const { data: reqManualId, error: errManual } = await adminClient.rpc("create_loan_request", {
    p_client: user.id,
    p_idempotency_key: keyManual,
    p_product: product.id,
    p_amount: product.min_amount,
    p_duration: product.min_duration_months,
    p_purpose: "Test financement stock mode manuel",
    p_monthly_income: 750000,
    p_disbursement_method: "INTERNAL",
    p_documents: null,
  });

  if (errManual) throw errManual;
  console.log("Demande créée (Manuel). ID:", reqManualId);

  const { data: reqManual } = await adminClient
    .from("loan_requests")
    .select("status, approved_amount, disbursed_at")
    .eq("id", reqManualId)
    .single();

  console.log("Statut de la demande:", reqManual.status, "(Attendu: SUBMITTED)");
  console.log("Disbursed at:", reqManual.disbursed_at, "(Attendu: null)");

  const { data: walletManual } = await adminClient
    .from("wallets")
    .select("disbursed_loan")
    .eq("client_id", user.id)
    .single();
  console.log(
    "Solde déboursé portefeuille:",
    walletManual.disbursed_loan,
    "FCFA (Attendu: 0 FCFA)",
  );

  if (reqManual.status !== "SUBMITTED" || walletManual.disbursed_loan !== 0) {
    throw new Error("ÉCHEC DU TEST MODE MANUEL");
  }
  console.log(
    "--> SUCCÈS MODE MANUEL : Le prêt reste en attente et les fonds ne sont PAS crédités indûment.",
  );

  // Nettoyage avant test auto
  await adminClient.from("loan_requests").delete().eq("id", reqManualId);

  // -------------------------------------------------------------
  // TEST B : MODE AUTOMATIQUE (auto_loan_approval = true)
  // -------------------------------------------------------------
  console.log("\n--- [2] Test du MODE AUTOMATIQUE (Instant Loan) ---");
  await adminClient.from("app_settings").update({ auto_loan_approval: true }).eq("id", true);

  const keyAuto = crypto.randomUUID();
  const { data: reqAutoId, error: errAuto } = await adminClient.rpc("create_loan_request", {
    p_client: user.id,
    p_idempotency_key: keyAuto,
    p_product: product.id,
    p_amount: product.min_amount,
    p_duration: product.min_duration_months,
    p_purpose: "Test financement fonds de roulement mode auto",
    p_monthly_income: 750000,
    p_disbursement_method: "INTERNAL",
    p_documents: null,
  });

  if (errAuto) throw errAuto;
  console.log("Demande créée (Automatique). ID:", reqAutoId);

  const { data: reqAuto } = await adminClient
    .from("loan_requests")
    .select("status, approved_amount, disbursed_at")
    .eq("id", reqAutoId)
    .single();

  console.log("Statut de la demande:", reqAuto.status, "(Attendu: DISBURSED)");
  console.log("Disbursed at:", reqAuto.disbursed_at, "(Attendu: date renseignée)");

  const { data: walletAuto } = await adminClient
    .from("wallets")
    .select("disbursed_loan")
    .eq("client_id", user.id)
    .single();
  console.log(
    "Solde déboursé portefeuille:",
    walletAuto.disbursed_loan,
    "FCFA (Attendu:",
    product.min_amount,
    "FCFA)",
  );

  const { data: contractAuto } = await adminClient
    .from("loan_contracts")
    .select("contract_number, signed_at")
    .eq("request_id", reqAutoId)
    .single();
  console.log(
    "Contrat généré et signé :",
    contractAuto?.contract_number,
    "Signé à:",
    contractAuto?.signed_at,
  );

  if (reqAuto.status !== "DISBURSED" || walletAuto.disbursed_loan !== product.min_amount) {
    throw new Error("ÉCHEC DU TEST MODE AUTOMATIQUE");
  }
  console.log(
    "--> SUCCÈS MODE AUTOMATIQUE : Le prêt est approuvé et le portefeuille est RÉELLEMENT crédité de",
    product.min_amount,
    "FCFA !",
  );

  console.log("\n=== TOUS LES TESTS DE BOUT EN BOUT SONT VALIDÉS AVEC SUCCÈS ===");
}

testModes().catch(console.error);

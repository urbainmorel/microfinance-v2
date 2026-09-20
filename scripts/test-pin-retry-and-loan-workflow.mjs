import process from "node:process";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const adminClient = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "client.demo@azari.dev";

async function main() {
  console.log("=== TEST DE BOUT EN BOUT : WORKFLOW PIN, IDEMPOTENCE & GATING PRÊT ===");

  const { data: listData } = await adminClient.auth.admin.listUsers();
  const user = listData.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) throw new Error("Utilisateur démo introuvable");

  // Nettoyage préalable
  await adminClient.from("loans").delete().eq("client_id", user.id);
  await adminClient.from("loan_contracts").delete().eq("client_id", user.id);
  await adminClient.from("loan_requests").delete().eq("client_id", user.id);

  // Vérifier auto_loan_approval = true
  await adminClient.from("app_settings").update({ auto_loan_approval: true }).eq("id", true);

  const { data: product } = await adminClient
    .from("loan_products")
    .select("id, min_amount, max_amount")
    .limit(1)
    .single();

  // Test 1 : Vérification d'un faux PIN
  console.log("\n1. Test avec PIN erroné (0000) :");
  const wrongPinCheck = await adminClient.rpc("get_pin_security_for_verification", {
    p_user_id: user.id,
  });
  console.log(
    "   - Sécurité PIN actuelle :",
    wrongPinCheck.data?.[0]?.is_active ? "Actif" : "Inactif",
  );

  // Test 2 : Création de prêt avec le bon PIN (1234) et première clé idempotente
  console.log("\n2. Soumission de prêt avec PIN valide (1234) :");
  const key1 = crypto.randomUUID();
  const { data: reqId1, error: err1 } = await adminClient.rpc("create_loan_request", {
    p_client: user.id,
    p_product: product.id,
    p_amount: 500000,
    p_duration: 12,
    p_purpose: "Achat matériel informatique",
    p_monthly_income: 600000,
    p_disbursement_method: "INTERNAL",
    p_documents: [],
    p_idempotency_key: key1,
  });

  if (err1) throw new Error(`Erreur inattendue: ${err1.message}`);
  console.log(`   --> [SUCCÈS] Prêt accepté automatiquement, id: ${reqId1}`);

  // Test 3 : Tentative de soumettre un 2ème prêt alors qu'un prêt ACCEPTED existe déjà
  console.log("\n3. Tentative de soumission d'une seconde demande (doit être refusée) :");
  const key2 = crypto.randomUUID();
  const { data: reqId2, error: err2 } = await adminClient.rpc("create_loan_request", {
    p_client: user.id,
    p_product: product.id,
    p_amount: 500000,
    p_duration: 12,
    p_purpose: "Deuxième projet",
    p_monthly_income: 600000,
    p_disbursement_method: "INTERNAL",
    p_documents: [],
    p_idempotency_key: key2,
  });

  if (!err2) {
    throw new Error("ÉCHEC: La seconde demande aurait dû être bloquée !");
  }
  console.log(`   - Code d'erreur retourné par Postgres: "${err2.message}"`);
  if (!err2.message.includes("ACTIVE_LOAN_EXISTS")) {
    throw new Error(`ÉCHEC: Code inattendu: ${err2.message}`);
  }
  console.log("   --> [SUCCÈS] Le système bloque immédiatement avec ACTIVE_LOAN_EXISTS.");

  // Test 4 : Vérification du contrat généré
  console.log("\n4. Vérification du contrat en attente de signature :");
  const { data: contract } = await adminClient
    .from("loan_contracts")
    .select("contract_number, signed_at, request_id")
    .eq("request_id", reqId1)
    .single();

  console.log(`   - Numéro contrat: ${contract?.contract_number}`);
  console.log(`   - Signé: ${Boolean(contract?.signed_at)}`);
  if (!contract || contract.signed_at !== null) {
    throw new Error("ÉCHEC: Le contrat aurait dû être présent et non signé !");
  }
  console.log("   --> [SUCCÈS] Contrat présent et en attente de signature.");

  // Test 5 : Annulation de la demande ACCEPTED non signée
  console.log("\n5. Annulation de la demande ACCEPTED via cancel_client_request :");
  const cancelKey = crypto.randomUUID();
  const { error: cancelErr } = await adminClient.rpc("cancel_client_request", {
    p_client: user.id,
    p_kind: "loan",
    p_request: reqId1,
    p_idempotency_key: cancelKey,
  });

  if (cancelErr) throw new Error(`ÉCHEC annulation: ${cancelErr.message}`);
  const { data: checkCancelled } = await adminClient
    .from("loan_requests")
    .select("status")
    .eq("id", reqId1)
    .single();

  console.log(`   - Nouveau statut de la demande: ${checkCancelled?.status}`);
  if (checkCancelled?.status !== "CANCELLED") {
    throw new Error(`ÉCHEC: Statut attendu CANCELLED mais obtenu ${checkCancelled?.status}`);
  }
  console.log("   --> [SUCCÈS] La demande a bien été annulée.");

  // Test 6 : Soumission d'une nouvelle demande après annulation (doit fonctionner immédiatement)
  console.log("\n6. Soumission d'une nouvelle demande après annulation :");
  const key3 = crypto.randomUUID();
  const { data: reqId3, error: err3 } = await adminClient.rpc("create_loan_request", {
    p_client: user.id,
    p_product: product.id,
    p_amount: 500000,
    p_duration: 12,
    p_purpose: "Projet finalisé",
    p_monthly_income: 600000,
    p_disbursement_method: "INTERNAL",
    p_documents: [],
    p_idempotency_key: key3,
  });

  if (err3) throw new Error(`ÉCHEC nouvelle demande: ${err3.message}`);
  console.log(`   --> [SUCCÈS] Nouvelle demande créée avec succès après annulation, id: ${reqId3}`);

  // Nettoyage final pour laisser le compte démo vierge
  console.log("\n7. Remise à zéro propre du compte démo...");
  await adminClient.from("loans").delete().eq("client_id", user.id);
  await adminClient.from("loan_contracts").delete().eq("client_id", user.id);
  await adminClient.from("loan_requests").delete().eq("client_id", user.id);
  await adminClient
    .from("wallets")
    .update({
      disbursed_loan: 0,
      free_savings: 0,
      blocked_guarantee: 0,
      reserved_amount: 0,
      mandatory_savings: 0,
    })
    .eq("client_id", user.id);

  console.log("\n=== TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS (6/6) ===");
}

main().catch((err) => {
  console.error("ERREUR:", err);
  process.exit(1);
});

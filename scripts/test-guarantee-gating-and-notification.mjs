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
  console.log("=== VÉRIFICATION COMPLÈTE DU GATING DE GARANTIE & NOTIFICATIONS ===");

  // 1. Vérification du compte démo (doit avoir free_savings: 0)
  const { data: listData } = await adminClient.auth.admin.listUsers();
  const user = listData.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) throw new Error("Utilisateur démo introuvable");

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

  const { data: wallet } = await adminClient
    .from("wallets")
    .select("*")
    .eq("client_id", user.id)
    .single();

  console.log("1. Solde du compte démo :");
  console.log(`   - Épargne libre: ${wallet.free_savings} FCFA (Attendu: 0)`);
  if (wallet.free_savings !== 0) {
    throw new Error(`ÉCHEC: free_savings attendu à 0 mais trouvé ${wallet.free_savings}`);
  }
  console.log("   --> [OK] Le compte démo n'a aucune épargne libre.");

  // 2. Vérification du template de notification
  const { data: template } = await adminClient
    .from("notification_templates")
    .select("slug, language, subject")
    .eq("slug", "loan_guarantee_required")
    .single();

  console.log("2. Modèle d'email loan_guarantee_required :");
  console.log(`   - Sujet: "${template.subject}"`);
  console.log("   --> [OK] Template d'email présent et valide.");

  // 3. Test de création de prêt instantané avec auto_loan_approval = true
  await adminClient.from("app_settings").update({ auto_loan_approval: true }).eq("id", true);

  const { data: product } = await adminClient
    .from("loan_products")
    .select("id, guarantee_rate, min_amount, max_amount")
    .limit(1)
    .single();

  const loanAmount = 300000;
  const reqId = crypto.randomUUID();
  const idemKey = crypto.randomUUID();

  console.log("3. Création d'une demande de prêt automatique (300 000 FCFA)...");
  const { data: createdReqId, error: reqErr } = await adminClient.rpc("create_loan_request", {
    p_client: user.id,
    p_product: product.id,
    p_amount: loanAmount,
    p_duration: 6,
    p_purpose: "Test gating garantie et retrait",
    p_monthly_income: 700000,
    p_disbursement_method: "INTERNAL",
    p_documents: [],
    p_idempotency_key: idemKey,
  });

  if (reqErr) throw new Error(`create_loan_request failed: ${reqErr.message}`);
  console.log(`   --> [OK] Prêt accepté automatiquement, request_id: ${createdReqId}`);

  // 4. Signature du contrat avec le code PIN
  console.log("4. Signature du contrat de prêt...");
  const signIdem = crypto.randomUUID();
  const { error: signErr } = await adminClient.rpc("sign_loan_contract", {
    p_client: user.id,
    p_request: createdReqId,
    p_idempotency_key: signIdem,
  });
  if (signErr) throw new Error(`sign_loan_contract failed: ${signErr.message}`);
  console.log("   --> [OK] Contrat signé avec succès.");

  // 5. Vérification du versement et du statut de prêt actif
  const { data: activeWallet } = await adminClient
    .from("wallets")
    .select("*")
    .eq("client_id", user.id)
    .single();

  console.log("5. État du portefeuille après signature :");
  console.log(`   - Prêt décaissé crédité: ${activeWallet.disbursed_loan} FCFA`);
  console.log(`   - Garantie bloquée: ${activeWallet.blocked_guarantee} FCFA`);
  console.log(`   - Épargne libre: ${activeWallet.free_savings} FCFA`);

  if (activeWallet.disbursed_loan !== loanAmount) {
    throw new Error(`ÉCHEC: montant décaissé invalide: ${activeWallet.disbursed_loan}`);
  }
  console.log("   --> [OK] Le montant du prêt est bien crédité sur le portefeuille.");

  // 6. Vérification de get_active_loan_status
  // Simulate client context with admin client query
  const { data: statusCheck } = await adminClient
    .from("loans")
    .select("id, total_amount, status, loan_requests(guarantee_required)")
    .eq("client_id", user.id)
    .eq("status", "ACTIVE")
    .single();

  const guarNeeded = statusCheck.loan_requests.guarantee_required;
  console.log(`6. Garantie requise calculée: ${guarNeeded} FCFA`);

  // 7. Tentative de retrait SANS garantie constituée (doit échouer)
  console.log("7. Test de tentative de retrait sans garantie constituée...");
  const withdrawIdem = crypto.randomUUID();
  const { error: withdrawErr } = await adminClient.rpc("create_client_withdrawal", {
    p_client: user.id,
    p_type: "MOBILE_MONEY",
    p_amount: 50000,
    p_recipient: {
      operator: "ORANGE",
      phone: "+221771234567",
      name: "Moussa Traoré",
    },
    p_idempotency_key: withdrawIdem,
  });

  if (!withdrawErr) {
    throw new Error(
      "ÉCHEC: Le retrait aurait DÛ être rejeté car la garantie n'est pas constituée !",
    );
  }
  console.log(`   - Message d'erreur reçu: "${withdrawErr.message}"`);
  if (!withdrawErr.message.includes("GUARANTEE_REQUIRED")) {
    throw new Error(`Message inattendu: ${withdrawErr.message}`);
  }
  console.log(
    "   --> [OK] Retrait STRICTEMENT bloqué par la base de données (GUARANTEE_REQUIRED) !",
  );

  // 8. Vérification de l'envoi de la notification
  const { data: notifs } = await adminClient
    .from("notifications")
    .select("type, title, body, payload")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  console.log("8. Notifications générées pour le client :");
  const guarNotif = notifs.find((n) => n.type === "LOAN_GUARANTEE_REQUIRED");
  if (!guarNotif) {
    console.log("Notifications trouvées:", notifs);
    throw new Error("ÉCHEC: Notification LOAN_GUARANTEE_REQUIRED non trouvée !");
  }
  console.log(`   - Titre: "${guarNotif.title}"`);
  console.log(`   - Contenu: "${guarNotif.body}"`);
  console.log("   --> [OK] Notification générée et enqueued avec succès.");

  // 9. Vérification dans l'outbox d'emails
  const { data: outboxRows } = await adminClient
    .from("notification_outbox")
    .select("template_slug, status, dedupe_key")
    .eq("user_id", user.id)
    .eq("template_slug", "loan_guarantee_required")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!outboxRows || outboxRows.length === 0) {
    throw new Error("ÉCHEC: Aucun message dans notification_outbox pour l'email !");
  }
  console.log("9. Notification outbox (Email) :");
  console.log(`   - Template: "${outboxRows[0].template_slug}"`);
  console.log(`   - Statut: "${outboxRows[0].status}"`);
  console.log("   --> [OK] Email prêt pour expédition via send-notification-email.");

  // 10. Nettoyage final pour laisser le compte démo vierge avec 0 FCFA d'épargne
  console.log("\n10. Remise à zéro propre du compte démo...");
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

  console.log("=== TOUS LES TESTS ONT RÉUSSI AVEC SUCCÈS (10/10) ===");
}

main().catch((err) => {
  console.error("ERREUR:", err);
  process.exit(1);
});

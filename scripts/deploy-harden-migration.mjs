import fs from "node:fs";
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Database error: ${JSON.stringify(data)}`);
  }
  return data;
}

async function run() {
  console.log("=== DÉPLOIEMENT DU DURCISSEMENT SQL SUPABASE (RLS, Concurrence, RPCs) ===");
  const sql = fs.readFileSync(
    "supabase/migrations/20261001160000_harden_chatbot_security_rls_and_concurrency.sql",
    "utf-8",
  );
  await querySql(sql);
  console.log("✓ Migration de durcissement exécutée avec succès !");

  console.log("Vérification des fonctions et politiques créées...");
  const functions = await querySql(`
    SELECT proname, prosrc 
    FROM pg_proc 
    WHERE proname IN (
      'create_support_ticket_atomic', 
      'post_support_message_and_transition', 
      'purge_expired_support_data'
    );
  `);
  console.log(
    "✓ Fonctions créées :",
    functions.map((f) => f.proname),
  );

  const policies = await querySql(`
    SELECT policyname, tablename, cmd, roles 
    FROM pg_policies 
    WHERE tablename IN ('support_tickets', 'support_messages');
  `);
  console.log("✓ Politiques RLS actives :", policies);
}

run().catch((err) => {
  console.error("Erreur de déploiement :", err);
  process.exit(1);
});

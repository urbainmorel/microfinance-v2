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
  console.log("=== DÉPLOIEMENT DU CORRECTIF SQL SUPABASE (Audit, HNSW, Index, RLS) ===");
  const sql = fs.readFileSync(
    "supabase/migrations/20261001150000_fix_chatbot_audit_and_indexes.sql",
    "utf-8",
  );
  await querySql(sql);
  console.log("✓ Migration corrective exécutée avec succès !");

  console.log("Test de l'index HNSW et des nouvelles définitions...");
  const indexes = await querySql(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND indexname IN (
        'idx_support_conv_user', 
        'idx_support_conv_agent', 
        'idx_support_conv_last_msg', 
        'idx_support_tickets_created', 
        'idx_support_tickets_conv', 
        'idx_support_tickets_handled', 
        'idx_knowledge_items_updated'
      );
  `);
  console.log("✓ Index créés :", indexes);
}

run().catch((err) => {
  console.error("Erreur de déploiement :", err);
  process.exit(1);
});

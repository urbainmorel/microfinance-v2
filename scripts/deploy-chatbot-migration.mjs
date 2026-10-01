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
  console.log("=== DÉPLOIEMENT DE LA MIGRATION CHATBOT DANS SUPABASE ===");
  const sql = fs.readFileSync(
    "supabase/migrations/20261001120000_create_chatbot_and_support_system.sql",
    "utf-8",
  );
  await querySql(sql);
  console.log("Migration exécutée avec succès !");

  console.log("Vérification des tables créées...");
  const tables = await querySql(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('chatbot_settings', 'knowledge_items', 'support_conversations', 'support_messages', 'support_tickets');
  `);
  console.log("Tables trouvées :", tables);

  const settings = await querySql(`SELECT * FROM public.chatbot_settings WHERE id;`);
  console.log("Configuration initiale chatbot_settings :", settings);
}

run().catch((err) => {
  console.error("Erreur de déploiement :", err);
  process.exit(1);
});

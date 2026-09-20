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
  console.log("=== Déploiement de la migration cancel_client_request ===");
  const sql = fs.readFileSync(
    "supabase/migrations/20260918001000_allow_cancelling_accepted_loan_request.sql",
    "utf8",
  );
  const result = await querySql(sql);
  console.log("Résultat déploiement:", result);
  console.log("--> Migration appliquée avec succès !");
}

run().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});

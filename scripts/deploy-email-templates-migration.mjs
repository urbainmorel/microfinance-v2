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
  console.log("=== DÉPLOIEMENT DES MODÈLES D'EMAILS DANS SUPABASE ===");
  const sql = fs.readFileSync(
    "supabase/migrations/20261012180000_modernize_email_templates.sql",
    "utf-8",
  );
  await querySql(sql);
  console.log("✅ Migration exécutée avec succès !");

  console.log("Vérification des modèles mis à jour...");
  const templates = await querySql(`
    SELECT slug, language, subject, length(body_html) as body_length, updated_at
    FROM public.notification_templates
    ORDER BY slug, language;
  `);
  console.log(`Nombre de modèles en base : ${templates.length}`);
  console.table(templates);
}

run().catch((err) => {
  console.error("Erreur de déploiement :", err);
  process.exit(1);
});

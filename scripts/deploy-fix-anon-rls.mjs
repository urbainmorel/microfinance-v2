import fs from "node:fs";
import process from "node:process";
process.loadEnvFile(".env.local");

const projectRef = "qdmriiokeindzgeokvqj";
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error("Erreur: SUPABASE_ACCESS_TOKEN manquant dans .env.local");
  process.exit(1);
}

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
  console.log("=== DÉPLOIEMENT DU CORRECTIF SQL : PERMISSIONS ANON ET RLS CHATBOT ===");
  const migrationPath =
    "supabase/migrations/20261002213000_fix_chatbot_anon_permissions_and_rls.sql";
  const sql = fs.readFileSync(migrationPath, "utf-8");

  console.log(`Exécution du script de migration : ${migrationPath}...`);
  await querySql(sql);
  console.log("✓ Migration exécutée avec succès !");

  console.log(
    "\n--- Vérification des privilèges de fonctions (auth_role & match_knowledge_items) ---",
  );
  const routinePrivileges = await querySql(`
    SELECT routine_name, grantee, privilege_type 
    FROM information_schema.routine_privileges 
    WHERE routine_name IN ('auth_role', 'match_knowledge_items')
    ORDER BY routine_name, grantee;
  `);
  console.log("Privilèges confirmés :", routinePrivileges);

  console.log("\n--- Vérification des politiques RLS actives ---");
  const policies = await querySql(`
    SELECT policyname, tablename, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename IN ('support_conversations', 'support_messages')
    ORDER BY tablename, policyname;
  `);
  console.log("Politiques actives :", policies);

  console.log("\n✓ Déploiement et vérifications terminés avec succès !");
}

run().catch((err) => {
  console.error("Erreur critique lors du déploiement :", err);
  process.exit(1);
});

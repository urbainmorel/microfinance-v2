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
  console.log("=== APPLICATION DE LA MIGRATION SIMULATE_LOAN SUR SUPABASE DISTANT ===");
  const migrationSql = fs.readFileSync(
    "supabase/migrations/20260926140000_clarify_simulate_loan_totals.sql",
    "utf-8",
  );
  await querySql(migrationSql);
  console.log("--> Migration appliquée avec succès !");

  console.log("\n=== TEST DE SIMULATION DU PRÊT 5 000 000 FCFA SUR 60 MOIS À 5% ===");
  const testRes = await querySql(`
    select public.simulate_loan(
      (select id from public.loan_products where name = 'Prêt Croissance' and is_active = true limit 1),
      5000000,
      60,
      current_date
    ) as simulation;
  `);

  const sim = testRes[0]?.simulation;
  console.log("Résultat de simulation :");
  console.log("- Produit :", sim.productName);
  console.log("- Montant demandé :", sim.amount, "FCFA");
  console.log("- Durée :", sim.durationMonths, "mois");
  console.log("- Taux nominal annuel :", sim.interestRate, "%");
  console.log("- Mensualité de remboursement prêt :", sim.monthlyPayment, "FCFA");
  console.log("- Total remboursé du prêt :", sim.loanTotalRepaid, "FCFA");
  console.log("- Frais totaux :", sim.totalFees, "FCFA");
  console.log("- Intérêts totaux :", sim.totalInterest, "FCFA");
  console.log("- Épargne obligatoire totale :", sim.mandatorySavingsTotal, "FCFA");
  console.log("- Garantie requise :", sim.guaranteeRequired, "FCFA");
  console.log("- Total montant récupérable :", sim.recoverableAmount, "FCFA");
  console.log("- Total prélevé avec épargne :", sim.totalDue, "FCFA");
}

run().catch((err) => {
  console.error("Échec :", err);
  process.exit(1);
});

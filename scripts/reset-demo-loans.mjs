import process from "node:process";

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "client.demo@azari.dev";

async function reset() {
  const { data: listData } = await adminClient.auth.admin.listUsers();
  const user = listData.users.find((u) => u.email === DEMO_EMAIL);
  if (!user) return;

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

  console.log("Demo user loans and wallet reset cleanly for testing!");
}

reset().catch(console.error);

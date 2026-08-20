import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const INTERNAL_SECRET_HEADER = "x-outbox-dispatch-secret";

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(name);
  return value;
}

async function secretsMatch(expected: string, provided: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [expectedHash, providedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
  ]);
  const left = new Uint8Array(expectedHash);
  const right = new Uint8Array(providedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function isAuthorized(req: Request): Promise<boolean> {
  const expected = Deno.env.get("OUTBOX_DISPATCH_SECRET");
  const provided = req.headers.get(INTERNAL_SECRET_HEADER);
  return Boolean(expected && provided && (await secretsMatch(expected, provided)));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        Allow: "POST, OPTIONS",
      },
    });
  }
  if (!(await isAuthorized(req))) {
    return jsonResponse({ error: "UNAUTHORIZED" }, 401);
  }

  try {
    const projectUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const dispatchSecret = requiredEnv("OUTBOX_DISPATCH_SECRET");
    const admin = adminClient();
    const { error: dailyJobsError } = await admin.rpc("run_daily_loan_jobs");
    if (dailyJobsError) throw new Error("DAILY_LOAN_JOBS_FAILED");
    const response = await fetch(`${projectUrl}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
        [INTERNAL_SECRET_HEADER]: dispatchSecret,
      },
      body: "{}",
    });

    const notificationDispatch = await response.json().catch(() => null);
    return jsonResponse(
      {
        dailyLoanJobs: {
          status: "COMPLETED",
        },
        notificationDispatch: {
          status: response.ok ? "COMPLETED" : "FAILED",
          summary: response.ok ? notificationDispatch : null,
        },
      },
      response.ok ? 200 : 502,
    );
  } catch {
    return jsonResponse(
      {
        error: "DISPATCH_FAILED",
        dailyLoanJobs: { status: "FAILED" },
      },
      500,
    );
  }
});

import type { SupabaseClient } from "@supabase/supabase-js";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { decryptRecoveryPayload } from "../_shared/recovery-crypto.ts";
import { adminClient } from "../_shared/supabase.ts";

const BATCH_SIZE = 25;
const INTERNAL_SECRET_HEADER = "x-outbox-dispatch-secret";

type JsonObject = Record<string, unknown>;
type OutboxRow = {
  id: string;
  user_id: string;
  template_slug: string;
  language: string;
  payload: unknown;
  dedupe_key: string;
};

type NotificationTemplate = {
  language: string;
  subject: string;
  body_html: string;
  variables: unknown;
};

class DeliveryError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "DeliveryError";
  }
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new DeliveryError(`MISSING_${name}`);
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

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeSubject(value: string): string {
  return value.replace(/[\r\n\u0000-\u001f\u007f]/g, " ").trim();
}

function scalarValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  throw new DeliveryError("INVALID_TEMPLATE_VALUE");
}

function declaredVariables(value: unknown): string[] {
  if (!Array.isArray(value)) throw new DeliveryError("INVALID_TEMPLATE_VARIABLES");
  const variables = value.filter(
    (entry): entry is string =>
      typeof entry === "string" && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(entry),
  );
  if (variables.length !== value.length || new Set(variables).size !== variables.length) {
    throw new DeliveryError("INVALID_TEMPLATE_VARIABLES");
  }
  return variables;
}

function renderTemplate(
  source: string,
  variables: string[],
  payload: unknown,
  html: boolean,
): string {
  if (!isObject(payload)) throw new DeliveryError("INVALID_OUTBOX_PAYLOAD");
  let rendered = source;
  for (const variable of variables) {
    if (!Object.prototype.hasOwnProperty.call(payload, variable)) continue;
    const raw = scalarValue(payload[variable]);
    const escaped = html ? escapeHtml(raw) : escapeSubject(raw);
    const token = new RegExp(`{{\\s*${variable}\\s*}}`, "g");
    rendered = rendered.replace(token, () => escaped);
  }
  return rendered;
}

async function reserveBatch(admin: SupabaseClient): Promise<OutboxRow[]> {
  const { data, error } = await admin.rpc("claim_notification_outbox", {
    p_limit: BATCH_SIZE,
  });
  if (error) throw new DeliveryError("OUTBOX_RESERVATION_FAILED");
  if (!Array.isArray(data)) throw new DeliveryError("INVALID_OUTBOX_BATCH");
  return data as OutboxRow[];
}

async function loadTemplate(
  admin: SupabaseClient,
  slug: string,
  language: string,
): Promise<NotificationTemplate> {
  const languages = language === "fr" ? ["fr"] : [language, "fr"];
  const { data, error } = await admin
    .from("notification_templates")
    .select("language, subject, body_html, variables")
    .eq("slug", slug)
    .in("language", languages);

  if (error) throw new DeliveryError("TEMPLATE_READ_FAILED");
  const templates = (data ?? []) as NotificationTemplate[];
  const template =
    templates.find((entry) => entry.language === language) ??
    templates.find((entry) => entry.language === "fr");
  if (!template) throw new DeliveryError("TEMPLATE_NOT_FOUND");
  return template;
}

async function deliver(
  admin: SupabaseClient,
  row: OutboxRow,
  resendApiKey: string,
  emailFrom: string,
): Promise<void> {
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(
    row.user_id,
  );
  const email = userData.user?.email;
  if (userError || !email) throw new DeliveryError("RECIPIENT_NOT_FOUND");

  const template = await loadTemplate(admin, row.template_slug, row.language);
  const variables = declaredVariables(template.variables);
  let payload = row.payload;
  if (row.template_slug === "pin_reset_otp") {
    if (!isObject(payload) || typeof payload.encrypted_payload !== "string") {
      throw new DeliveryError("INVALID_RECOVERY_PAYLOAD");
    }
    try {
      payload = await decryptRecoveryPayload(
        requiredEnv("PIN_RECOVERY_SECRET"),
        payload.encrypted_payload,
      );
    } catch {
      throw new DeliveryError("INVALID_RECOVERY_PAYLOAD");
    }
  }
  const subject = renderTemplate(template.subject, variables, payload, false);
  const html = renderTemplate(template.body_html, variables, payload, true);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": row.dedupe_key,
    },
    body: JSON.stringify({ from: emailFrom, to: [email], subject, html }),
  });

  if (!response.ok) throw new DeliveryError(`RESEND_HTTP_${response.status}`);
}

function safeFailureCode(error: unknown): string {
  return error instanceof DeliveryError ? error.code.slice(0, 120) : "DELIVERY_FAILED";
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
    const resendApiKey = requiredEnv("RESEND_API_KEY");
    const emailFrom = requiredEnv("EMAIL_FROM");
    const admin = adminClient();
    const rows = await reserveBatch(admin);
    let sent = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await deliver(admin, row, resendApiKey, emailFrom);
        const { error } = await admin.rpc("complete_notification_outbox", {
          p_id: row.id,
          p_success: true,
          p_error: null,
        });
        if (error) throw new DeliveryError("OUTBOX_SENT_UPDATE_FAILED");
        sent += 1;
      } catch (error) {
        const { error: updateError } = await admin.rpc("complete_notification_outbox", {
          p_id: row.id,
          p_success: false,
          p_error: safeFailureCode(error),
        });
        if (!updateError) failed += 1;
      }
    }

    return jsonResponse({ reserved: rows.length, sent, failed });
  } catch (error) {
    return jsonResponse({ error: safeFailureCode(error) }, 500);
  }
});

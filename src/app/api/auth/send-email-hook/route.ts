import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { renderAuthEmails, type SupabaseAuthEmailPayload } from "@/lib/server/auth-email";
import { sendAuthEmail } from "@/lib/server/auth-email-delivery";
import { getAuthEmailSettings } from "@/lib/server/auth-email-settings";
import { verifyStandardWebhook } from "@/lib/server/standard-webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_HOOK_BYTES = 512 * 1024;

function hookError(status: number, message: string) {
  return NextResponse.json(
    { error: { http_code: status, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_HOOK_BYTES) {
    return hookError(413, "Payload Auth Hook trop volumineux.");
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return hookError(400, "Payload Auth Hook illisible.");
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_HOOK_BYTES) {
    return hookError(413, "Payload Auth Hook trop volumineux.");
  }

  const webhookId = request.headers.get("webhook-id")?.trim() ?? "";
  const webhookTimestamp = request.headers.get("webhook-timestamp")?.trim() ?? "";
  const webhookSignature = request.headers.get("webhook-signature")?.trim() ?? "";
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return hookError(401, "Signature Auth Hook absente.");
  }

  let settings;
  try {
    settings = await getAuthEmailSettings();
  } catch {
    return hookError(500, "Configuration Auth Hook indisponible.");
  }

  let payload: SupabaseAuthEmailPayload;
  try {
    payload = verifyStandardWebhook(
      rawBody,
      {
        "webhook-id": webhookId,
        "webhook-timestamp": webhookTimestamp,
        "webhook-signature": webhookSignature,
      },
      settings.hookSecret,
    ) as SupabaseAuthEmailPayload;
  } catch {
    return hookError(401, "Signature Auth Hook invalide.");
  }

  try {
    const messages = await renderAuthEmails(payload, settings);
    const results = await Promise.allSettled(
      messages.map((message, index) => {
        const recipientHash = createHash("sha256")
          .update(message.recipientEmail)
          .digest("hex")
          .slice(0, 16);
        return sendAuthEmail(message, settings, `auth-${webhookId}-${index}-${recipientHash}`);
      }),
    );

    if (results.some((result) => result.status === "rejected")) {
      console.error(
        JSON.stringify({
          event: "auth_email_delivery_failed",
          failures: results.filter((result) => result.status === "rejected").length,
        }),
      );
      return hookError(500, "Échec de l'envoi de l'email d'authentification.");
    }

    return NextResponse.json({}, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "auth_email_hook_failed",
        message: error instanceof Error ? error.message.slice(0, 200) : "unknown",
      }),
    );
    return hookError(500, "Échec de traitement Auth Hook.");
  }
}

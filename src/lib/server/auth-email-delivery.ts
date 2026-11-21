import type { AuthEmailSettings } from "./auth-email-settings";
import type { AuthEmailMessage } from "./auth-email";

const PROVIDER_TIMEOUT_MS = 2_000;
const SUPPORT_EMAIL = "support@azari-microfinance.site";

class ProviderError extends Error {
  constructor(
    readonly provider: "resend" | "brevo",
    readonly status: number | "network",
  ) {
    super(`${provider}_${status}`);
  }
}

function parseSender(value: string): { email: string; name?: string } {
  const match = value.match(/^(?:"?([^"]*)"?\s)?<([^>]+)>$/);
  if (match) {
    const email = match[2]?.trim();
    if (email) {
      const name = match[1]?.trim();
      return name ? { email, name } : { email };
    }
  }
  return { email: value.trim() };
}

async function sendWithResend(
  message: AuthEmailMessage,
  settings: AuthEmailSettings,
  idempotencyKey: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: settings.resendFrom,
        to: [message.recipientEmail],
        reply_to: SUPPORT_EMAIL,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch {
    throw new ProviderError("resend", "network");
  }

  if (!response.ok) {
    throw new ProviderError("resend", response.status);
  }
}

async function sendWithBrevo(
  message: AuthEmailMessage,
  settings: AuthEmailSettings,
  idempotencyKey: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": settings.brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseSender(settings.brevoFrom),
        to: [{ email: message.recipientEmail }],
        replyTo: { email: SUPPORT_EMAIL },
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        headers: { "X-Mailin-custom": idempotencyKey },
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch {
    throw new ProviderError("brevo", "network");
  }

  if (!response.ok) {
    throw new ProviderError("brevo", response.status);
  }
}

/**
 * Envoie via Resend puis bascule sur Brevo en cas d'erreur, de quota ou de
 * délai dépassé. Les deux appels restent sous le budget de 5 s du hook.
 */
export async function sendAuthEmail(
  message: AuthEmailMessage,
  settings: AuthEmailSettings,
  idempotencyKey: string,
): Promise<"resend" | "brevo"> {
  try {
    await sendWithResend(message, settings, idempotencyKey);
    return "resend";
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : "network";
    console.warn(
      JSON.stringify({
        event: "auth_email_provider_fallback",
        provider: "brevo",
        reason: `resend_${status}`,
      }),
    );
  }

  await sendWithBrevo(message, settings, idempotencyKey);
  return "brevo";
}

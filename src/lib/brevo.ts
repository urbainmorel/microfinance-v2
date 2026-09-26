export type BrevoSender = {
  email: string;
  name?: string;
};

export type BrevoRecipient = {
  email: string;
  name?: string;
};

export type SendBrevoEmailParams = {
  sender?: BrevoSender;
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags?: string[];
  headers?: Record<string, string>;
};

export function parseSenderString(senderString: string): BrevoSender {
  const match = senderString.match(/^(?:(?:"?([^"]*)"?\s)?<([^>]+)>|([^<>\s]+))$/);
  if (match) {
    const name = match[1]?.trim();
    const email = (match[2] ?? match[3])?.trim();
    if (email) {
      return name ? { email, name } : { email };
    }
  }
  return { email: senderString.trim() };
}

/**
 * Envoie un email transactionnel via l'API HTTP REST de Brevo (v3).
 */
export async function sendBrevoEmail(params: SendBrevoEmailParams): Promise<{ messageId: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY non configurée.");
  }

  const defaultSender = parseSenderString(
    process.env.EMAIL_FROM || "Azari Microfinance <notifications@azari-microfinance.site>",
  );

  const payload = {
    sender: params.sender || defaultSender,
    to: params.to,
    subject: params.subject,
    htmlContent: params.htmlContent,
    textContent: params.textContent,
    tags: params.tags,
    headers: params.headers,
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    const safeErrorSnippet = errorText
      .replace(/[\r\n\x00-\x1f\x7f]/g, " ")
      .trim()
      .slice(0, 100);
    throw new Error(
      `BREVO_HTTP_${response.status}${safeErrorSnippet ? `: ${safeErrorSnippet}` : ""}`,
    );
  }

  return (await response.json()) as { messageId: string };
}

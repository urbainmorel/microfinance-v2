import { createHmac, timingSafeEqual } from "node:crypto";

export type StandardWebhookHeaders = {
  "webhook-id": string;
  "webhook-timestamp": string;
  "webhook-signature": string;
};

const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60;

function secretBytes(secret: string): Buffer | null {
  const normalized = secret
    .trim()
    .replace(/^v1,whsec_/, "")
    .replace(/^whsec_/, "");
  if (!normalized) return null;
  try {
    return Buffer.from(normalized, "base64");
  } catch {
    return null;
  }
}

function signatureMatches(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Vérifie la signature Standard Webhooks utilisée par Supabase Auth.
 * Le secret Supabase est au format `v1,whsec_<base64>` ; plusieurs secrets
 * séparés par des virgules sont acceptés pour permettre la rotation.
 */
export function verifyStandardWebhook(
  payload: string,
  headers: StandardWebhookHeaders,
  configuredSecrets: string,
): unknown {
  const timestamp = Number(headers["webhook-timestamp"]);
  if (!Number.isFinite(timestamp)) {
    throw new Error("Horodatage du webhook invalide.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > MAX_TIMESTAMP_SKEW_SECONDS) {
    throw new Error("Webhook expiré.");
  }

  const signedContent = `${headers["webhook-id"]}.${headers["webhook-timestamp"]}.${payload}`;
  const receivedSignatures = headers["webhook-signature"]
    .split(" ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf(",");
      return separator === -1 ? entry : entry.slice(separator + 1);
    })
    .filter(Boolean);

  const key = secretBytes(configuredSecrets);
  const valid = key
    ? receivedSignatures.some((received) =>
        signatureMatches(
          createHmac("sha256", key).update(signedContent).digest("base64"),
          received,
        ),
      )
    : false;

  if (!valid) {
    throw new Error("Signature du webhook invalide.");
  }

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    throw new Error("Payload du webhook invalide.");
  }
}

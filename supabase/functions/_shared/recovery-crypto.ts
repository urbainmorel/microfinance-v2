const encoder = new TextEncoder();
const decoder = new TextDecoder();

function requireStrongSecret(secret: string): void {
  if (encoder.encode(secret).length < 32) throw new Error("PIN_RECOVERY_SECRET_TOO_SHORT");
}

function toBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  requireStrongSecret(secret);
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function hashRecoveryOtp(
  secret: string,
  userId: string,
  otp: string,
): Promise<string> {
  requireStrongSecret(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${userId}:${otp}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function encryptRecoveryPayload(
  secret: string,
  payload: Record<string, unknown>,
): Promise<{ encrypted_payload: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(secret);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return {
    encrypted_payload: `v1.${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`,
  };
}

export async function decryptRecoveryPayload(
  secret: string,
  encryptedPayload: string,
): Promise<Record<string, unknown>> {
  const [version, encodedIv, encodedCiphertext] = encryptedPayload.split(".");
  if (version !== "v1" || !encodedIv || !encodedCiphertext) {
    throw new Error("INVALID_RECOVERY_PAYLOAD");
  }
  const key = await deriveAesKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(encodedIv) },
    key,
    fromBase64(encodedCiphertext),
  );
  const parsed: unknown = JSON.parse(decoder.decode(plaintext));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("INVALID_RECOVERY_PAYLOAD");
  }
  return parsed as Record<string, unknown>;
}

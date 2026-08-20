import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";

const OTP_EXPIRATION_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 3;
const REQUEST_COOLDOWN_SECONDS = 60;

type JsonObject = Record<string, unknown>;
type Challenge = {
  id: string;
  otp_hash: string;
  attempts: number;
  expires_at: string;
};
type RecoveryProfile = {
  is_active: boolean | null;
  preferred_language: string | null;
};

class RecoveryError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = "RecoveryError";
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: JsonObject,
  required: readonly string[],
): boolean {
  return (
    required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    Object.keys(value).every((key) => required.includes(key))
  );
}

function generateOtp(): string {
  const range = 1_000_000;
  const maximum = Math.floor(0x1_0000_0000 / range) * range;
  const values = new Uint32Array(1);
  do crypto.getRandomValues(values);
  while (values[0] >= maximum);
  return String(values[0] % range).padStart(6, "0");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function hashesMatch(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function requireActiveProfile(
  admin: SupabaseClient,
  userId: string,
): Promise<RecoveryProfile> {
  const { data, error } = await admin
    .from("profiles")
    .select("is_active, preferred_language")
    .eq("id", userId)
    .maybeSingle<RecoveryProfile>();

  if (error) throw new RecoveryError("REQUEST_FAILED", 500);
  if (data?.is_active !== true) throw new RecoveryError("FORBIDDEN", 403);
  return data;
}

async function requestReset(userId: string): Promise<Response> {
  const admin = adminClient();
  const profile = await requireActiveProfile(admin, userId);
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60_000).toISOString();
  const { data: recent, error: recentError } = await admin
    .from("pin_reset_challenges")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", hourAgo)
    .order("created_at", { ascending: false })
    .limit(MAX_REQUESTS_PER_HOUR);

  if (recentError) throw new RecoveryError("REQUEST_FAILED", 500);
  if ((recent?.length ?? 0) >= MAX_REQUESTS_PER_HOUR) {
    throw new RecoveryError("RATE_LIMITED", 429);
  }
  const latestCreatedAt = recent?.[0]?.created_at;
  if (
    latestCreatedAt &&
    new Date(latestCreatedAt).getTime() > now - REQUEST_COOLDOWN_SECONDS * 1_000
  ) {
    throw new RecoveryError("RATE_LIMITED", 429);
  }

  const otp = generateOtp();
  const otpHash = await sha256(`${userId}:${otp}`);
  const expiresAt = new Date(now + OTP_EXPIRATION_MINUTES * 60_000).toISOString();
  const { data: challenge, error: challengeError } = await admin
    .from("pin_reset_challenges")
    .insert({ user_id: userId, otp_hash: otpHash, expires_at: expiresAt })
    .select("id")
    .single<{ id: string }>();

  if (challengeError || !challenge) throw new RecoveryError("REQUEST_FAILED", 500);

  const { error: outboxError } = await admin.from("notification_outbox").insert({
    user_id: userId,
    event_type: "pin_reset_otp",
    template_slug: "pin_reset_otp",
    language: profile?.preferred_language || "fr",
    payload: { otp },
    dedupe_key: `pin-reset:${challenge.id}`,
  });

  if (outboxError) {
    await admin
      .from("pin_reset_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id)
      .is("consumed_at", null);
    throw new RecoveryError("REQUEST_FAILED", 500);
  }

  return jsonResponse({ status: "OTP_QUEUED" }, 202);
}

async function confirmReset(
  userId: string,
  otp: unknown,
  newPin: unknown,
): Promise<Response> {
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    throw new RecoveryError("OTP_INVALID", 400);
  }
  if (typeof newPin !== "string" || !/^\d{4,6}$/.test(newPin)) {
    throw new RecoveryError("PIN_INVALID", 400);
  }

  const admin = adminClient();
  await requireActiveProfile(admin, userId);
  const { data: challenge, error } = await admin
    .from("pin_reset_challenges")
    .select("id, otp_hash, attempts, expires_at")
    .eq("user_id", userId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Challenge>();

  if (error) throw new RecoveryError("CONFIRM_FAILED", 500);
  if (!challenge) throw new RecoveryError("OTP_INVALID", 400);

  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    await admin
      .from("pin_reset_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id)
      .is("consumed_at", null);
    throw new RecoveryError("OTP_EXPIRED", 410);
  }
  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    await admin
      .from("pin_reset_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id)
      .is("consumed_at", null);
    throw new RecoveryError("OTP_LOCKED", 423);
  }

  const candidateHash = await sha256(`${userId}:${otp}`);
  if (!(await hashesMatch(candidateHash, challenge.otp_hash))) {
    const attempts = challenge.attempts + 1;
    const locked = attempts >= MAX_OTP_ATTEMPTS;
    const { data: updated, error: updateError } = await admin
      .from("pin_reset_challenges")
      .update({
        attempts,
        ...(locked ? { consumed_at: new Date().toISOString() } : {}),
      })
      .eq("id", challenge.id)
      .eq("attempts", challenge.attempts)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();
    if (updateError) throw new RecoveryError("CONFIRM_FAILED", 500);
    if (!updated) throw new RecoveryError("OTP_INVALID", 400);
    throw new RecoveryError(locked ? "OTP_LOCKED" : "OTP_INVALID", locked ? 423 : 400);
  }

  const consumedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin
    .from("pin_reset_challenges")
    .update({ consumed_at: consumedAt })
    .eq("id", challenge.id)
    .eq("attempts", challenge.attempts)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (claimError) throw new RecoveryError("CONFIRM_FAILED", 500);
  if (!claimed) throw new RecoveryError("OTP_INVALID", 400);

  const { error: consumeError } = await admin
    .from("pin_reset_challenges")
    .update({ consumed_at: consumedAt })
    .eq("user_id", userId)
    .is("consumed_at", null);
  if (consumeError) {
    await admin
      .from("pin_reset_challenges")
      .update({ consumed_at: null })
      .eq("user_id", userId)
      .eq("consumed_at", consumedAt);
    throw new RecoveryError("CONFIRM_FAILED", 500);
  }

  const pinHash = await bcrypt.hash(newPin, 12);
  const { error: profileError } = await admin
    .from("profiles")
    .update({ pin_hash: pinHash, pin_attempts: 0, pin_locked_until: null })
    .eq("id", userId);
  if (profileError) {
    await admin
      .from("pin_reset_challenges")
      .update({ consumed_at: null })
      .eq("user_id", userId)
      .eq("consumed_at", consumedAt);
    throw new RecoveryError("CONFIRM_FAILED", 500);
  }

  return jsonResponse({ status: "PIN_RESET" });
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

  const userId = await getUserId(req);
  if (!userId) return jsonResponse({ error: "UNAUTHENTICATED" }, 401);

  const body = await req.json().catch(() => null);
  if (!isObject(body) || typeof body.action !== "string") {
    return jsonResponse({ error: "VALIDATION_ERROR" }, 400);
  }

  try {
    if (body.action === "request" && hasExactKeys(body, ["action"])) {
      return await requestReset(userId);
    }
    if (body.action === "confirm" && hasExactKeys(body, ["action", "otp", "newPin"])) {
      return await confirmReset(userId, body.otp, body.newPin);
    }
    throw new RecoveryError("VALIDATION_ERROR", 400);
  } catch (error) {
    if (error instanceof RecoveryError) {
      return jsonResponse({ error: error.code }, error.status);
    }
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500);
  }
});

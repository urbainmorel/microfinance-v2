import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOCK_THRESHOLD = 5;
const LOCK_STEP_MINUTES = 15;
const PIN_PATTERN = /^\d{4,6}$/;

export type PinErrorCode = "FORBIDDEN" | "PIN_INVALID" | "PIN_LOCKED" | "PIN_NOT_CONFIGURED";

export class PinVerificationError extends Error {
  constructor(
    readonly code: PinErrorCode,
    readonly status: number,
    readonly details?: { attempts?: number; lockedUntil?: string },
  ) {
    super(code);
    this.name = "PinVerificationError";
  }
}

type PinProfile = {
  is_active: boolean | null;
  pin_hash: string | null;
  pin_attempts: number | null;
  pin_locked_until: string | null;
};

/** Verifie un PIN cote serveur et applique le verrouillage progressif existant. */
export async function verifyPin(
  admin: SupabaseClient,
  userId: string,
  pin: unknown,
): Promise<void> {
  if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) {
    throw new PinVerificationError("PIN_INVALID", 401);
  }

  const { data, error } = await admin
    .from("profiles")
    .select("is_active, pin_hash, pin_attempts, pin_locked_until")
    .eq("id", userId)
    .single<PinProfile>();

  if (error) throw error;
  if (data?.is_active !== true) {
    throw new PinVerificationError("FORBIDDEN", 403);
  }
  if (!data?.pin_hash) {
    throw new PinVerificationError("PIN_NOT_CONFIGURED", 400);
  }

  if (data.pin_locked_until && new Date(data.pin_locked_until).getTime() > Date.now()) {
    throw new PinVerificationError("PIN_LOCKED", 423, {
      lockedUntil: data.pin_locked_until,
    });
  }

  const matches = await bcrypt.compare(pin, data.pin_hash);
  if (!matches) {
    const attempts = Math.max(0, data.pin_attempts ?? 0) + 1;
    const lockedUntil =
      attempts >= LOCK_THRESHOLD
        ? new Date(
            Date.now() +
              LOCK_STEP_MINUTES * 60_000 * (attempts - (LOCK_THRESHOLD - 1)),
          ).toISOString()
        : null;

    const { error: updateError } = await admin
      .from("profiles")
      .update({ pin_attempts: attempts, pin_locked_until: lockedUntil })
      .eq("id", userId);

    if (updateError) throw updateError;

    if (lockedUntil) {
      throw new PinVerificationError("PIN_LOCKED", 423, { attempts, lockedUntil });
    }
    throw new PinVerificationError("PIN_INVALID", 401, { attempts });
  }

  const { error: resetError } = await admin
    .from("profiles")
    .update({ pin_attempts: 0, pin_locked_until: null })
    .eq("id", userId);

  if (resetError) throw resetError;
}

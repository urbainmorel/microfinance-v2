import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";
import * as bcrypt from "npm:bcryptjs@3.0.2";

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
  failed_attempts: number | null;
  locked_until: string | null;
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
    .rpc("get_pin_security_for_verification", { p_user_id: userId })
    .single<PinProfile>();

  if (error) throw error;
  if (data?.is_active !== true) {
    throw new PinVerificationError("FORBIDDEN", 403);
  }
  if (!data?.pin_hash) {
    throw new PinVerificationError("PIN_NOT_CONFIGURED", 400);
  }

  if (data.locked_until && new Date(data.locked_until).getTime() > Date.now()) {
    throw new PinVerificationError("PIN_LOCKED", 423, {
      lockedUntil: data.locked_until,
    });
  }

  const matches = await bcrypt.compare(pin, data.pin_hash);
  if (!matches) {
    const { data: failures, error: updateError } = await admin.rpc(
      "record_pin_verification_failure",
      {
        p_user_id: userId,
        p_lock_threshold: LOCK_THRESHOLD,
        p_lock_step_minutes: LOCK_STEP_MINUTES,
      },
    );

    if (updateError) throw updateError;
    const failure = failures?.[0];
    if (!failure) throw new Error("PIN_SECURITY_STATE_MISSING");
    const attempts = failure.attempts;
    const lockedUntil = failure.new_locked_until;

    if (lockedUntil) {
      throw new PinVerificationError("PIN_LOCKED", 423, { attempts, lockedUntil });
    }
    throw new PinVerificationError("PIN_INVALID", 401, { attempts });
  }

  const { error: resetError } = await admin.rpc("record_pin_verification_success", {
    p_user_id: userId,
  });

  if (resetError) throw resetError;
}

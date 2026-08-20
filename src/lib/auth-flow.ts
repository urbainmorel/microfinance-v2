import type { DatabaseClient } from "@/lib/database.types";

export type OnboardingState = { pin_set: boolean; kyc_status: string | null };

/** Étape obligatoire avant d'autoriser le reste de l'espace client. */
export function requiredOnboardingPath(state: OnboardingState): string | null {
  if (!state.pin_set) return "/auth/set-pin";
  if (!state.kyc_status || state.kyc_status === "NONE" || state.kyc_status === "INFO_REQUESTED") {
    return "/client/kyc";
  }
  return null;
}

/**
 * Destination post-authentification selon l'état du compte (PRD §4.2) :
 * email non vérifié → vérification ; PIN absent → création PIN ;
 * KYC non commencé → wizard KYC ; sinon → dashboard.
 */
export async function resolvePostAuthPath(supabase: DatabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/auth/login";
  if (user.app_metadata?.account_active === false) return "/auth/login?reason=disabled";
  if (!user.email_confirmed_at) return "/auth/verify-email";
  if (user.app_metadata?.user_role === "admin") return "/admin";

  const { data, error } = await supabase.rpc("get_onboarding_state").single();
  if (error) return "/auth/login?reason=session";
  const state = (data ?? null) as OnboardingState | null;
  if (!state) return "/auth/login?reason=session";
  return requiredOnboardingPath(state) ?? "/client/dashboard";
}

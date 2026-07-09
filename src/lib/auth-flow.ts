import type { SupabaseClient } from "@supabase/supabase-js";

type OnboardingState = { pin_set: boolean; kyc_status: string | null };

/**
 * Destination post-authentification selon l'état du compte (PRD §4.2) :
 * email non vérifié → vérification ; PIN absent → création PIN ;
 * KYC non commencé → wizard KYC ; sinon → dashboard.
 */
export async function resolvePostAuthPath(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/auth/login";
  if (!user.email_confirmed_at) return "/auth/verify-email";

  const { data } = await supabase.rpc("get_onboarding_state").single();
  const state = (data ?? null) as OnboardingState | null;
  if (!state?.pin_set) return "/auth/set-pin";
  if (!state.kyc_status || state.kyc_status === "NONE") return "/client/kyc";
  return "/client/dashboard";
}

import { isAccountInactive, roleFromAppMetadata } from "@/lib/access-control";
import { ROUTES } from "@/lib/constants/routes";

import type { DatabaseClient } from "@/lib/database.types";

export type OnboardingState = { pin_set: boolean; kyc_status: string | null };

/** Étape obligatoire avant d'autoriser le reste de l'espace client (PIN requis). */
export function requiredOnboardingPath(state: OnboardingState): string | null {
  if (!state.pin_set) return ROUTES.AUTH.SET_PIN;
  return null;
}

/**
 * Destination post-authentification selon l'état du compte :
 * email non vérifié → vérification ; PIN absent → création PIN ;
 * sinon → dashboard (actions conditionnées ensuite au KYC).
 */
export async function resolvePostAuthPath(supabase: DatabaseClient): Promise<string> {
  const [userResult, claimsResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ]);
  const user = userResult.data.user;
  const appMetadata = claimsResult.data?.claims?.app_metadata;
  if (!user) return ROUTES.AUTH.LOGIN;
  if (isAccountInactive(appMetadata)) return `${ROUTES.AUTH.LOGIN}?reason=disabled`;
  if (!user.email_confirmed_at) return ROUTES.AUTH.VERIFY_EMAIL;
  if (roleFromAppMetadata(appMetadata) === "admin") return ROUTES.ADMIN.HOME;

  const { data, error } = await supabase.rpc("get_onboarding_state").single();
  if (error) return `${ROUTES.AUTH.LOGIN}?reason=session`;
  const state = (data ?? null) as OnboardingState | null;
  if (!state) return `${ROUTES.AUTH.LOGIN}?reason=session`;
  return requiredOnboardingPath(state) ?? ROUTES.CLIENT.DASHBOARD;
}

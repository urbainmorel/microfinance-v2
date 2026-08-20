import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isAccountInactive, roleFromAppMetadata } from "@/lib/access-control";
import { requiredOnboardingPath, type OnboardingState } from "@/lib/auth-flow";
import { getPublicEnvSafe } from "@/lib/env";

/**
 * Protection des routes. Le rôle est lu depuis le claim JWT
 * `app_metadata.user_role`; les RPC privilégiées le vérifient aussi en base.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const access = await resolveAccess(request, response);

  if (pathname.startsWith("/admin")) {
    return guardAdmin(access, request, response);
  }

  if (pathname.startsWith("/client")) {
    return guardClient(pathname, access, request, response);
  }

  if (pathname === "/auth/set-pin" && access.role !== null) {
    return guardSetPin(access, request, response);
  }

  return response;
}

function guardAdmin(
  access: AccessState,
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  return access.role === "admin" ? response : redirectTo("/auth/login", request, response);
}

function guardClient(
  pathname: string,
  access: AccessState,
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  if (access.role === null) return redirectTo("/auth/login", request, response);
  if (!access.emailVerified) return redirectTo("/auth/verify-email", request, response);
  if (access.role === "admin") return redirectTo("/admin", request, response);
  if (!access.onboarding) return redirectTo("/auth/login?reason=session", request, response);

  const required = requiredOnboardingPath(access.onboarding);
  if (required && pathname !== required) return redirectTo(required, request, response);
  if (!required && pathname === "/client/kyc") {
    return redirectTo("/client/dashboard", request, response);
  }
  return response;
}

function guardSetPin(
  access: AccessState,
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  if (!access.emailVerified) return redirectTo("/auth/verify-email", request, response);
  if (access.role === "admin") return redirectTo("/admin", request, response);
  if (!access.onboarding) return redirectTo("/auth/login?reason=session", request, response);
  const required = requiredOnboardingPath(access.onboarding);
  return required === "/auth/set-pin"
    ? response
    : redirectTo(required ?? "/client/dashboard", request, response);
}

function redirectTo(path: string, request: NextRequest, source: NextResponse): NextResponse {
  const url = request.nextUrl.clone();
  const [pathname, search = ""] = path.split("?");
  url.pathname = pathname ?? path;
  url.search = search ? `?${search}` : "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

type AccessState = {
  emailVerified: boolean;
  onboarding: OnboardingState | null;
  role: string | null;
};

/** Session et état d'onboarding, ou accès nul en cas de configuration invalide. */
async function resolveAccess(request: NextRequest, response: NextResponse): Promise<AccessState> {
  const env = getPublicEnvSafe();
  const denied: AccessState = { emailVerified: false, onboarding: null, role: null };
  if (env === null) return denied;

  try {
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) =>
            toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
        },
      },
    );
    const [userResult, claimsResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getClaims(),
    ]);
    const user = userResult.data.user;
    const appMetadata = claimsResult.data?.claims?.app_metadata;
    if (!user || claimsResult.error || isAccountInactive(appMetadata)) return denied;
    const role = roleFromAppMetadata(appMetadata);
    if (role === "admin") {
      return { emailVerified: Boolean(user.email_confirmed_at), onboarding: null, role };
    }
    const { data, error } = await supabase.rpc("get_onboarding_state").single();
    return {
      emailVerified: Boolean(user.email_confirmed_at),
      onboarding: error ? null : ((data ?? null) as OnboardingState | null),
      role,
    };
  } catch {
    return denied;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { normalizeAppRole } from "@/lib/access-control";
import { getPublicEnvSafe } from "@/lib/env";

/**
 * Protection des routes. Le rôle est lu depuis le claim JWT
 * `app_metadata.user_role`; les RPC privilégiées le vérifient aussi en base.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const role = await resolveRole(request, response);

  if (pathname.startsWith("/admin")) {
    if (role !== "admin") return redirectTo("/auth/login", request);
    return response;
  }

  if (pathname.startsWith("/client")) {
    if (role === null) return redirectTo("/auth/login", request);
    if (role === "admin") return redirectTo("/admin", request);
    return response;
  }

  return response;
}

function redirectTo(path: string, request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.redirect(url);
}

/** Rôle courant, ou null si la session ou la configuration est absente. */
async function resolveRole(request: NextRequest, response: NextResponse): Promise<string | null> {
  const env = getPublicEnvSafe();
  if (env === null) return null;

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    if (user.app_metadata?.account_active === false) return null;
    return normalizeAppRole(user.app_metadata?.user_role);
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnvSafe } from "@/lib/env";

const STAFF_ROLES = new Set([
  "agent_credit",
  "agent_caisse",
  "validator",
  "admin",
  "super_admin",
  "auditor",
]);

/**
 * Protection des routes — squelette Lot 0 (Specs §A « Architecture des routes »).
 * Le rôle est lu depuis le claim JWT `app_metadata.user_role`, sans requête base.
 * Les redirections fines selon l'état (email/PIN/KYC, PRD §4.2) sont ajoutées au Lot 2.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const role = await resolveRole(request, response);

  if (pathname.startsWith("/admin")) {
    if (role === null || !STAFF_ROLES.has(role)) return redirectTo("/auth/login", request);
    return response;
  }

  if (pathname.startsWith("/client")) {
    if (role === null) return redirectTo("/auth/login", request);
    return response;
  }

  return response;
}

function redirectTo(path: string, request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.redirect(url);
}

/** Rôle de l'utilisateur courant, ou null si non authentifié / non configuré. */
async function resolveRole(request: NextRequest, response: NextResponse): Promise<string | null> {
  const env = getPublicEnvSafe();
  if (env === null) return null;

  try {
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    const claim = user.app_metadata?.user_role;
    return typeof claim === "string" ? claim : "client";
  } catch {
    // Défaut sûr : toute erreur d'auth ⇒ non authentifié (deny by default).
    return null;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { resolvePostAuthPath } from "@/lib/auth-flow";
import { getPublicEnv } from "@/lib/env";

import type { Database, DatabaseClient } from "@/lib/database.types";
import type { EmailOtpType } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface VerifyParams {
  code: string | null;
  token_hash: string | null;
  token: string | null;
  type: EmailOtpType;
}

function sanitizeInternalRedirect(path: string | null): string | null {
  if (!path) return null;
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  // Empêche les attaques Open Redirect (ex: //evil.com, https://evil.com, /\evil.com)
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) {
    return null;
  }
  return path;
}

function applyNoStoreHeaders(response: NextResponse): void {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
}

/**
 * Netlify exécute les routes dans une fonction dont `request.url` peut porter
 * l'URL de déploiement (`<deploy>--site.netlify.app`). Les redirections doivent
 * rester sur l'origine canonique configurée, jamais sur cette URL interne.
 */
function applicationOrigin(request: NextRequest): string {
  const configured =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    // Netlify expose l'URL canonique du site dans `URL` à l'exécution.
    process.env.URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      // Ne jamais ancrer les redirections sur l'hôte interne Netlify.
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        !url.hostname.endsWith(".netlify.app")
      ) {
        return url.origin;
      }
    } catch {
      // Repli ci-dessous si la variable est invalide.
    }
  }

  const requestOrigin = request.nextUrl.origin;
  try {
    const hostname = new URL(requestOrigin).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
      return requestOrigin;
    }
  } catch {
    // Repli canonique ci-dessous.
  }

  // L'environnement des fonctions Netlify ne garantit pas les variables
  // ci-dessus et `request.url` porte alors l'hôte interne `*.netlify.app`.
  return "https://azari-microfinance.site";
}

function applyCookies(
  response: NextResponse,
  cookies: { name: string; value: string; options: CookieOptions }[],
): void {
  // Déduplication par nom pour ne conserver que l'état final (ex: suppression au lieu d'un jeton actif)
  const cookieMap = new Map<string, { value: string; options: CookieOptions }>();
  for (const cookie of cookies) {
    cookieMap.set(cookie.name, { value: cookie.value, options: cookie.options });
  }
  cookieMap.forEach(({ value, options }, name) => {
    response.cookies.set(name, value, options);
  });
}

function redirectToVerificationFailure(request: NextRequest): NextResponse {
  // Un fragment d'URL (#access_token, #type=signup) n'est jamais reçu par le
  // serveur : il ne peut donc jamais prouver une vérification. Seuls un code
  // PKCE ou un token_hash sont validés auprès de Supabase avant d'afficher
  // le message de succès.
  const errorResponse = NextResponse.redirect(
    new URL("/auth/login?error=verification_failed", applicationOrigin(request)),
  );
  applyNoStoreHeaders(errorResponse);
  return errorResponse;
}

async function verifyAuthSession(
  supabase: DatabaseClient,
  params: VerifyParams,
): Promise<{ success: boolean; email?: string }> {
  const activeToken = params.token_hash ?? params.token;
  if (activeToken) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: activeToken,
      type: params.type,
    });
    return { success: !error, email: data.user?.email ?? undefined };
  }
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    return { success: !error, email: data.user?.email ?? undefined };
  }
  return { success: false };
}

async function determineRedirectPath(
  supabase: DatabaseClient,
  next: string | null,
): Promise<string> {
  const safeNext = sanitizeInternalRedirect(next);
  if (safeNext) return safeNext;
  try {
    return await resolvePostAuthPath(supabase);
  } catch {
    return "/auth/set-pin";
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const token = searchParams.get("token");
  const type = (searchParams.get("type") ?? "signup") as EmailOtpType;
  const next = searchParams.get("next");
  const origin = applicationOrigin(request);

  if (!code && !token_hash && !token) {
    return redirectToVerificationFailure(request);
  }

  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];
  const env = getPublicEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(newCookies: { name: string; value: string; options: CookieOptions }[]) {
          newCookies.forEach((cookie) => cookiesToSet.push(cookie));
        },
      },
    },
  ) as unknown as DatabaseClient;

  const { success, email } = await verifyAuthSession(supabase, { code, token_hash, token, type });
  if (!success) {
    return redirectToVerificationFailure(request);
  }

  // Pour une réinitialisation de mot de passe ou un flux avec next explicite autre que l'inscription
  if (type === "recovery" || (next && type !== "signup")) {
    const targetPath = await determineRedirectPath(supabase, next);
    const response = NextResponse.redirect(new URL(targetPath, origin));
    applyCookies(response, cookiesToSet);
    applyNoStoreHeaders(response);
    return response;
  }

  // Fin d'inscription : déconnexion de la session pour inviter l'utilisateur à se connecter
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Erreur lors de la déconnexion post-vérification:", err);
  }

  const loginUrl = new URL("/auth/login?verified=true", origin);
  if (email) {
    loginUrl.searchParams.set("email", email);
  }

  const response = NextResponse.redirect(loginUrl);
  applyCookies(response, cookiesToSet);
  applyNoStoreHeaders(response);

  return response;
}

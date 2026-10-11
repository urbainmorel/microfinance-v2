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

function renderHashFallbackHtml(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Vérification du compte...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #090d16;
      color: #ffffff;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255,255,255,0.15);
      border-top-color: #077bad;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <p style="font-size: 14px; opacity: 0.85;">Confirmation de votre compte en cours...</p>
  <script>
    (function() {
      var hash = window.location.hash || '';
      if (hash.indexOf('error') !== -1) {
        window.location.replace('/auth/login?error=verification_failed');
      } else if (hash.indexOf('access_token') !== -1 || hash.indexOf('refresh_token') !== -1 || hash.indexOf('type=signup') !== -1) {
        window.location.replace('/auth/login?verified=true');
      } else {
        window.location.replace('/auth/login');
      }
    })();
  </script>
</body>
</html>`;
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

  if (!code && !token_hash && !token) {
    const htmlResponse = new NextResponse(renderHashFallbackHtml(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    applyNoStoreHeaders(htmlResponse);
    return htmlResponse;
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
    const errorResponse = NextResponse.redirect(
      new URL("/auth/login?error=verification_failed", request.url),
    );
    applyNoStoreHeaders(errorResponse);
    return errorResponse;
  }

  // Pour une réinitialisation de mot de passe ou un flux avec next explicite autre que l'inscription
  if (type === "recovery" || (next && type !== "signup")) {
    const targetPath = await determineRedirectPath(supabase, next);
    const response = NextResponse.redirect(new URL(targetPath, request.url));
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

  const loginUrl = new URL("/auth/login?verified=true", request.url);
  if (email) {
    loginUrl.searchParams.set("email", email);
  }

  const response = NextResponse.redirect(loginUrl);
  applyCookies(response, cookiesToSet);
  applyNoStoreHeaders(response);

  return response;
}

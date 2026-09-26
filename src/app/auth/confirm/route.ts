import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { resolvePostAuthPath } from "@/lib/auth-flow";
import { getPublicEnv } from "@/lib/env";

import type { Database, DatabaseClient } from "@/lib/database.types";
import type { EmailOtpType } from "@supabase/supabase-js";

interface VerifyParams {
  code: string | null;
  token_hash: string | null;
  token: string | null;
  type: EmailOtpType;
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
      var hash = window.location.hash;
      if (hash && (hash.indexOf('access_token') !== -1 || hash.indexOf('refresh_token') !== -1)) {
        window.location.replace('/auth/set-pin' + hash);
      } else {
        window.location.replace('/auth/login?reason=verification');
      }
    })();
  </script>
</body>
</html>`;
}

async function verifyAuthSession(supabase: DatabaseClient, params: VerifyParams): Promise<boolean> {
  const activeToken = params.token_hash ?? params.token;
  if (activeToken) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: activeToken,
      type: params.type,
    });
    return !error;
  }
  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    return !error;
  }
  return false;
}

async function determineRedirectPath(
  supabase: DatabaseClient,
  next: string | null,
): Promise<string> {
  if (next) return next;
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
    return new NextResponse(renderHashFallbackHtml(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
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

  const success = await verifyAuthSession(supabase, { code, token_hash, token, type });
  if (!success) {
    return NextResponse.redirect(new URL("/auth/login?reason=verification", request.url));
  }

  const targetPath = await determineRedirectPath(supabase, next);
  const response = NextResponse.redirect(new URL(targetPath, request.url));

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}

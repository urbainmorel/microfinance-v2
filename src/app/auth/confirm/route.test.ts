import { readFile } from "node:fs/promises";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/auth/confirm/route";
import * as authFlowModule from "@/lib/auth-flow";

const mockVerifyOtp = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      verifyOtp: mockVerifyOtp,
      exchangeCodeForSession: mockExchangeCodeForSession,
      signOut: mockSignOut,
    },
  })),
}));

vi.mock("@/lib/env", () => ({
  getPublicEnv: vi.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
  })),
}));

vi.mock("@/lib/auth-flow", () => ({
  resolvePostAuthPath: vi.fn().mockResolvedValue("/client/dashboard"),
}));

describe("GET /auth/confirm - validation signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("redirige vers /auth/login?verified=true avec l'email et déconnecte la session lors d'un signup validé par token_hash", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { email: "nouveau@example.com" } },
      error: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=valid_hash&type=signup",
    );
    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: "valid_hash",
      type: "signup",
    });
    expect(mockSignOut).toHaveBeenCalled();
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/auth/login?verified=true");
    expect(location).toContain("email=nouveau%40example.com");
  });

  it("redirige vers /auth/login?verified=true lors d'une validation par code PKCE", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { user: { email: "pkce@example.com" } },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/auth/confirm?code=valid_code");
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid_code");
    expect(mockSignOut).toHaveBeenCalled();
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/auth/login?verified=true");
    expect(location).toContain("email=pkce%40example.com");
  });
});

describe("GET /auth/confirm - erreurs et fallback hash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("redirige vers /auth/login?error=verification_failed si la validation OTP échoue", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: null },
      error: new Error("Invalid token"),
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=bad_token&type=signup",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login?error=verification_failed");
  });

  it("ne revendique jamais une vérification quand aucun token ni code n'est fourni", async () => {
    const request = new NextRequest("http://localhost:3000/auth/confirm");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/auth/login?error=verification_failed");
    expect(location).not.toContain("verified=true");
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("ne traite pas un fragment d'URL comme une preuve de vérification", async () => {
    const request = new NextRequest("http://localhost:3000/auth/confirm#type=signup");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("error=verification_failed");
    expect(location).not.toContain("verified=true");
  });

  it("redirige vers l'origine canonique APP_URL et non vers l'URL de déploiement Netlify", async () => {
    vi.stubEnv("APP_URL", "https://azari-microfinance.site");
    const request = new NextRequest(
      "https://6b0026a043c217baf0921ac1--azari-microfinance.netlify.app/auth/confirm",
    );
    const response = await GET(request);
    vi.unstubAllEnvs();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://azari-microfinance.site/auth/login?error=verification_failed",
    );
  });
});

describe("GET /auth/confirm - sécurité et résilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("préserve le flux de récupération de mot de passe (type=recovery) sans déconnecter", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { email: "recovery@example.com" } },
      error: null,
    });
    vi.spyOn(authFlowModule, "resolvePostAuthPath").mockResolvedValue("/auth/update-password");

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=rec_hash&type=recovery",
    );
    const response = await GET(request);

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/update-password");
  });

  it("neutralise les tentatives d'open-redirect vers des URLs externes via le paramètre next", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { email: "recovery@example.com" } },
      error: null,
    });
    vi.spyOn(authFlowModule, "resolvePostAuthPath").mockResolvedValue("/auth/set-pin");

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=rec_hash&type=recovery&next=https://malicious.com",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).not.toContain("malicious.com");
    expect(location).toContain("/auth/set-pin");
  });

  it("bloque les tentatives d'open-redirect avec bypass encodé (ex: /%2Fevil.com)", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { email: "recovery@example.com" } },
      error: null,
    });
    vi.spyOn(authFlowModule, "resolvePostAuthPath").mockResolvedValue("/auth/set-pin");

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=rec_hash&type=recovery&next=/%2F%2Fmalicious.com",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).not.toContain("malicious.com");
    expect(location).toContain("/auth/set-pin");
  });

  it("reste résilient et redirige vers login même si signOut échoue", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { email: "resilient@example.com" } },
      error: null,
    });
    mockSignOut.mockRejectedValue(new Error("Supabase network error"));

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=valid_hash&type=signup",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login?verified=true");
  });

  it("applique les en-têtes de sécurité anti-cache (no-store, no-cache, private)", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { user: { email: "cachetest@example.com" } },
      error: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/auth/confirm?token_hash=hash&type=signup",
    );
    const response = await GET(request);

    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});

describe("modèle de confirmation", () => {
  it("envoie un lien token_hash vérifié côté serveur, jamais ConfirmationURL", async () => {
    const html = await readFile(
      new URL("../../../../supabase/templates/confirmation.html", import.meta.url),
      "utf8",
    );

    expect(html).toContain(
      "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=signup",
    );
    expect(html).not.toContain("{{ .ConfirmationURL }}");
  });
});

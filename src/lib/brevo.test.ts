import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseSenderString, sendBrevoEmail } from "./brevo";

describe("parseSenderString", () => {
  it("extrait le nom et l'email au format 'Nom <email@domaine.com>'", () => {
    const result = parseSenderString("Azari Microfinance <contact@azari-microfinance.site>");
    expect(result).toEqual({
      name: "Azari Microfinance",
      email: "contact@azari-microfinance.site",
    });
  });

  it("gère les guillemets autour du nom '\"Nom\" <email@domaine.com>'", () => {
    const result = parseSenderString('"Azari Notifications" <notifications@azari.site>');
    expect(result).toEqual({
      name: "Azari Notifications",
      email: "notifications@azari.site",
    });
  });

  it("gère une adresse email brute sans nom", () => {
    const result = parseSenderString("contact@azari-microfinance.site");
    expect(result).toEqual({
      email: "contact@azari-microfinance.site",
    });
  });

  it("nettoie les espaces superflus", () => {
    const result = parseSenderString("   support@azari.site   ");
    expect(result).toEqual({
      email: "support@azari.site",
    });
  });
});

describe("sendBrevoEmail", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, BREVO_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("enveloppe automatiquement le contenu HTML dans le gabarit officiel", async () => {
    let capturedBody: { htmlContent?: string } | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ messageId: "msg_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const res = await sendBrevoEmail({
      to: [{ email: "client@example.com" }],
      subject: "Confirmation de prêt",
      htmlContent: "<p>Votre prêt est prêt.</p>",
    });

    expect(res.messageId).toBe("msg_123");

    expect(capturedBody).toBeDefined();
    const body = capturedBody as unknown as { htmlContent: string };
    expect(body.htmlContent).toContain("<!DOCTYPE html");
    expect(body.htmlContent).toContain("Azari Microfinance");
    expect(body.htmlContent).toContain("Votre prêt est prêt.");
  });
});

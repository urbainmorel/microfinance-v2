import { describe, expect, it } from "vitest";

import { renderAuthEmails, type SupabaseAuthEmailPayload } from "./auth-email";
import type { AuthEmailSettings } from "./auth-email-settings";

const settings: AuthEmailSettings = {
  resendApiKey: "re_test",
  brevoApiKey: "brevo_test",
  hookSecret: "v1,whsec_test",
  resendFrom: "Azari Microfinance <noreply@mail.azari-microfinance.site>",
  brevoFrom: "Azari Microfinance <support@azari-microfinance.site>",
  siteUrl: "https://azari-microfinance.site",
};

function payload(overrides: Partial<SupabaseAuthEmailPayload["email_data"]> = {}) {
  return {
    user: { email: "client@example.test" },
    email_data: {
      token: "123456",
      token_hash: "hash_signup",
      redirect_to: "https://azari-microfinance.site/auth/confirm",
      email_action_type: "signup",
      site_url: "https://azari-microfinance.site",
      token_new: "",
      token_hash_new: "",
      ...overrides,
    },
  } satisfies SupabaseAuthEmailPayload;
}

describe("renderAuthEmails", () => {
  it("rend le modèle de confirmation avec le lien token_hash et l'adresse", async () => {
    const messages = await renderAuthEmails(payload(), settings);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.recipientEmail).toBe("client@example.test");
    expect(messages[0]?.subject).toContain("Confirmez votre compte");
    expect(messages[0]?.html).toContain("<!DOCTYPE html>");
    expect(messages[0]?.html).toContain(
      "https://azari-microfinance.site/auth/confirm?token_hash=hash_signup&amp;type=signup",
    );
    expect(messages[0]?.html).toContain("client@example.test");
    expect(messages[0]?.html).not.toContain("{{");
  });

  it("rend le lien de récupération avec le type recovery", async () => {
    const messages = await renderAuthEmails(
      payload({ email_action_type: "recovery", token_hash: "hash_recovery" }),
      settings,
    );

    expect(messages[0]?.subject).toContain("Réinitialisation");
    expect(messages[0]?.html).toContain("token_hash=hash_recovery&amp;type=recovery");
  });

  it("envoie deux emails lors d'un changement d'adresse sécurisé", async () => {
    const messages = await renderAuthEmails(
      {
        user: { email: "ancien@example.test", new_email: "nouveau@example.test" },
        email_data: {
          token: "111111",
          token_hash: "hash_new",
          token_new: "222222",
          token_hash_new: "hash_current",
          redirect_to: "https://azari-microfinance.site/auth/confirm",
          email_action_type: "email_change",
          site_url: "https://azari-microfinance.site",
        },
      },
      settings,
    );

    expect(messages.map((message) => message.recipientEmail).sort()).toEqual([
      "ancien@example.test",
      "nouveau@example.test",
    ]);
    expect(
      messages.find((message) => message.recipientEmail === "ancien@example.test")?.html,
    ).toContain("token_hash=hash_current");
    expect(
      messages.find((message) => message.recipientEmail === "nouveau@example.test")?.html,
    ).toContain("token_hash=hash_new");
  });

  it("rend un code OTP pour la réauthentification", async () => {
    const messages = await renderAuthEmails(
      payload({ email_action_type: "reauthentication", token: "654321" }),
      settings,
    );

    expect(messages[0]?.subject).toContain("code de vérification");
    expect(messages[0]?.html).toContain("654321");
  });
});

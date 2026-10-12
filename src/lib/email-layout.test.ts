import { describe, expect, it } from "vitest";

import {
  renderTemplatePreview,
  sampleVariablesForTemplate,
  wrapInEmailLayout,
} from "./email-layout";

describe("email-layout", () => {
  it("enveloppe un contenu brut dans un gabarit HTML complet avec en-tête et pied de page", () => {
    const rawContent = "<p>Bonjour, votre compte a été crédité.</p>";
    const result = wrapInEmailLayout(rawContent, {
      subject: "Confirmation de transaction",
      language: "fr",
    });

    expect(result).toContain("<!DOCTYPE html");
    expect(result).toContain("Azari Microfinance");
    expect(result).toContain("Notification Officielle");
    expect(result).toContain("Bonjour, votre compte a été crédité.");
    expect(result).toContain("Conseil sécurité");
    expect(result).toContain("support@azari-microfinance.site");
  });

  it("ne ré-enveloppe pas un document HTML déjà complet", () => {
    const fullHtml = "<!DOCTYPE html><html><body><p>Déjà complet</p></body></html>";
    const result = wrapInEmailLayout(fullHtml);
    expect(result).toBe(fullHtml);
  });

  it("génère des textes en anglais si la langue 'en' est spécifiée", () => {
    const rawContent = "<p>Your file has been approved.</p>";
    const result = wrapInEmailLayout(rawContent, {
      subject: "File approved",
      language: "en",
    });

    expect(result).toContain('lang="en"');
    expect(result).toContain("Official Notification");
    expect(result).toContain("Security reminder");
    expect(result).toContain("All rights reserved.");
  });

  it("échappe les caractères spéciaux dans le sujet", () => {
    const rawContent = "<p>Message</p>";
    const result = wrapInEmailLayout(rawContent, {
      subject: "Test <spécial> & 'accent'",
    });

    expect(result).toContain("&lt;spécial&gt; &amp; &#39;accent&#39;");
  });

  it("fournit des variables d'exemple réalistes pour les modèles", () => {
    const kycSamples = sampleVariablesForTemplate("kyc_completed");
    expect(kycSamples.client_firstname).toBeDefined();

    const otpSamples = sampleVariablesForTemplate("pin_reset_otp");
    expect(otpSamples.otp).toBeDefined();

    const preview = renderTemplatePreview(
      "<p>Code: {{otp}} pour {{client_firstname}}</p>",
      "pin_reset_otp",
    );
    expect(preview).toContain("Code: 739 104");
  });
});

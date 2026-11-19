import { describe, expect, it } from "vitest";

import { maskSensitivePII } from "./rag-service";

describe("maskSensitivePII", () => {
  it("masque les numéros de carte bancaire à 16 chiffres en préservant les 4 derniers", () => {
    const text = "Voici mon numéro de carte: 4532-1234-5678-9012 pour le paiement";
    const masked = maskSensitivePII(text);
    expect(masked).toContain("[CARTE_BANCAIRE_...9012]");
    expect(masked).not.toContain("4532");
  });

  it("masque les IBAN sensibles", () => {
    const text = "Mon virement vers BJ6601001550000012345678 svp";
    const masked = maskSensitivePII(text);
    expect(masked).toContain("[COMPTE_BANCAIRE_MASQUE]");
    expect(masked).not.toContain("BJ6601001550000012345678");
  });

  it("masque les codes secrets, mots de passe et CVV", () => {
    const text = "Mon mot de passe: SuperSecret99! et mon code secret: 4321";
    const masked = maskSensitivePII(text);
    expect(masked).toContain("[SECRET_MASQUE]");
    expect(masked).not.toContain("SuperSecret99!");
    expect(masked).not.toContain("4321");
  });

  it("masque un code PIN introduit naturellement avec le verbe est", () => {
    const text = "Mon code PIN est 1234. Mon numéro de carte est 4532 1234 5678 9012.";
    const masked = maskSensitivePII(text);
    expect(masked).not.toContain("1234");
    expect(masked).toContain("code PIN: [SECRET_MASQUE]");
    expect(masked).toContain("[CARTE_BANCAIRE_...9012]");
  });

  it("préserve les montants normaux et les numéros courts", () => {
    const text = "Je veux emprunter 500 000 FCFA sur une durée de 12 mois.";
    const result = maskSensitivePII(text);
    expect(result).toBe("Je veux emprunter 500 000 FCFA sur une durée de 12 mois.");
  });
});

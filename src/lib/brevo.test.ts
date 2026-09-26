import { describe, expect, it } from "vitest";

import { parseSenderString } from "./brevo";

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

import { describe, expect, it } from "vitest";

import { formatFcfa } from "@/lib/format";
import { MAX_LOAN_AMOUNT, MIN_LOAN_AMOUNT } from "@/lib/loans/loan-limits";

import { getLoanAmountLimitReply, parseLoanAmountRequest } from "./loan-amount-guard";

describe("parseLoanAmountRequest", () => {
  it("extrait un montant exprimé en millions", () => {
    expect(parseLoanAmountRequest("Je veux un prêt de 10 millions")).toBe(10_000_000);
    expect(parseLoanAmountRequest("Je veux un 10 millions")).toBe(10_000_000);
  });

  it("extrait un montant séparé par des espaces", () => {
    expect(parseLoanAmountRequest("Je souhaite emprunter 2 000 000 FCFA")).toBe(2_000_000);
  });

  it("extrait un montant abrégé en k", () => {
    expect(parseLoanAmountRequest("Un crédit de 50k FCFA")).toBe(50_000);
    expect(parseLoanAmountRequest("Je veux un prêt de 50 000F")).toBe(50_000);
  });

  it("ignore un retrait ou un dépôt", () => {
    expect(parseLoanAmountRequest("Je veux retirer 10 millions")).toBeNull();
    expect(parseLoanAmountRequest("Je souhaite faire un dépôt de 50 000 FCFA")).toBeNull();
  });

  it("ignore un montant qui n'est pas une demande de financement", () => {
    expect(parseLoanAmountRequest("Mon chiffre d'affaires est de 10 millions")).toBeNull();
    expect(parseLoanAmountRequest("Je veux épargner 50 000 FCFA")).toBeNull();
    expect(parseLoanAmountRequest("Je veux acheter une voiture à 10 millions")).toBeNull();
    expect(parseLoanAmountRequest("10 millions")).toBeNull();
  });

  it("ignore les durées et les petits nombres sans contexte monétaire", () => {
    expect(parseLoanAmountRequest("Un prêt de 2 000 000 FCFA sur 24 mois")).toBe(2_000_000);
    expect(parseLoanAmountRequest("Quel est le taux du prêt ?")).toBeNull();
  });
});

describe("getLoanAmountLimitReply", () => {
  it("indique le plafond de 5 000 000 FCFA pour une demande supérieure", () => {
    const reply = getLoanAmountLimitReply("Je veux un prêt de 10 millions FCFA");

    expect(reply).toContain(formatFcfa(MAX_LOAN_AMOUNT));
    expect(reply).toContain("plafond");
    expect(reply).toContain(formatFcfa(10_000_000));
    expect(reply).not.toMatch(/conseiller|en ligne|mise en relation/i);
  });

  it("indique le minimum de 100 000 FCFA pour une demande inférieure", () => {
    const reply = getLoanAmountLimitReply("Je veux un prêt de 50 000 FCFA");

    expect(reply).toContain(formatFcfa(MIN_LOAN_AMOUNT));
    expect(reply).toContain("inférieure");
    expect(reply).toContain(formatFcfa(50_000));
    expect(reply).not.toMatch(/conseiller|en ligne|mise en relation/i);
  });

  it("laisse la demande dans la fourchette au traitement normal", () => {
    expect(getLoanAmountLimitReply("Je veux un prêt de 2 000 000 FCFA")).toBeNull();
    expect(getLoanAmountLimitReply("Je veux un prêt de 100 000 FCFA")).toBeNull();
    expect(getLoanAmountLimitReply("Je veux un prêt de 5 000 000 FCFA")).toBeNull();
  });

  it("ne répond pas sur un montant qui ne concerne pas un prêt", () => {
    expect(getLoanAmountLimitReply("Je veux retirer 10 millions")).toBeNull();
    expect(getLoanAmountLimitReply("Mon chiffre d'affaires est de 10 millions")).toBeNull();
  });
});

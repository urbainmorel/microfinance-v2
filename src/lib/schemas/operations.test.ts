import { describe, expect, it } from "vitest";

import {
  depositRequestSchema,
  repaymentRequestSchema,
  withdrawalRequestSchema,
} from "@/lib/schemas/operations";

const base = {
  amount: 50_000,
  recipientName: "Awa Diop",
  pin: "123456",
};

describe("withdrawalRequestSchema", () => {
  it("accepte un virement bancaire UMOA complet", () => {
    const result = withdrawalRequestSchema.safeParse({
      ...base,
      type: "BANK_TRANSFER",
      bank: "Banque Atlantique",
      bankCode: "CI001",
      account: "01234567890",
      country: "CI",
      iban: "CI93CI00101234567890",
      motif: "Retrait épargne",
    });

    expect(result.success).toBe(true);
  });

  it("refuse un virement bancaire incomplet", () => {
    const result = withdrawalRequestSchema.safeParse({
      ...base,
      type: "BANK_TRANSFER",
      bank: "Banque",
      bankCode: "",
      account: "123",
      country: "CI",
      motif: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toEqual(expect.arrayContaining(["bankCode", "account", "motif"]));
    }
  });

  it("refuse un pays hors UMOA", () => {
    const result = withdrawalRequestSchema.safeParse({
      ...base,
      type: "BANK_TRANSFER",
      bank: "Banque",
      bankCode: "GH01",
      account: "123456789",
      country: "GH",
      motif: "Retrait",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["country"]);
  });

  it("valide séparément les coordonnées Mobile Money", () => {
    expect(
      withdrawalRequestSchema.safeParse({
        ...base,
        type: "MOBILE_MONEY",
        operator: "WAVE",
        phone: "+2250701020304",
      }).success,
    ).toBe(true);
  });
});

const proof = new File(["preuve"], "preuve.pdf", { type: "application/pdf" });

describe("référence des paiements électroniques", () => {
  it("refuse un dépôt Mobile Money sans référence avant le téléversement", () => {
    const result = depositRequestSchema.safeParse({
      amount: 10_000,
      motif: "FREE_SAVINGS",
      paymentMethod: "MOBILE_MONEY",
      reference: "",
      proof,
      certified: true,
      pin: "123456",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["reference"]);
  });

  it("autorise un dépôt en espèces sans référence", () => {
    expect(
      depositRequestSchema.safeParse({
        amount: 10_000,
        motif: "FREE_SAVINGS",
        paymentMethod: "CASH",
        reference: "",
        proof,
        certified: true,
        pin: "123456",
      }).success,
    ).toBe(true);
  });

  it("refuse un remboursement électronique sans référence", () => {
    const result = repaymentRequestSchema.safeParse({
      loanId: "11111111-1111-4111-8111-111111111111",
      amount: 10_000,
      paymentMethod: "BANK_TRANSFER",
      reference: "",
      proof,
      pin: "123456",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["reference"]);
  });
});

import { describe, expect, it } from "vitest";

import { withdrawalRequestSchema } from "@/lib/schemas/operations";

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

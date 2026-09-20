import { describe, expect, it } from "vitest";

import { loanRequestSchema } from "@/lib/schemas/loan";

describe("loanRequestSchema", () => {
  const validBase = {
    productId: "123e4567-e89b-12d3-a456-426614174000",
    amount: 150000,
    durationMonths: 6,
    startDate: "2026-10-01",
    purpose: "Achat de matériel pour l'atelier",
    monthlyIncomeEstimate: 300000,
    acceptedTerms: true,
    pin: "1234",
  };

  it("validates successfully without providing documents or disbursementMethod", () => {
    const result = loanRequestSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.disbursementMethod).toBe("INTERNAL");
      expect(result.data.documents).toEqual([]);
    }
  });

  it("validates when purpose is provided and at least 5 chars", () => {
    const tooShort = loanRequestSchema.safeParse({
      ...validBase,
      purpose: "test",
    });
    expect(tooShort.success).toBe(false);
  });

  it("rejects when acceptedTerms is false", () => {
    const notAccepted = loanRequestSchema.safeParse({
      ...validBase,
      acceptedTerms: false,
    });
    expect(notAccepted.success).toBe(false);
  });
});

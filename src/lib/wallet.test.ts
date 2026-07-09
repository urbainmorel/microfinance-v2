import { describe, expect, it } from "vitest";

import { computeWalletSummary } from "./wallet";

describe("computeWalletSummary — formules uniques (Specs §F, PRD §7.2)", () => {
  it("reproduit l'exemple chiffré du PRD §7.2", () => {
    const s = computeWalletSummary({
      free_savings: 25000,
      disbursed_loan: 100000,
      blocked_guarantee: 10000,
      mandatory_savings: 5000,
      reserved_amount: 30000,
    });
    expect(s.available).toBe(95000); // 25000 + 100000 − 30000
    expect(s.blocked).toBe(15000); // 10000 + 5000
    expect(s.reserved).toBe(30000);
    expect(s.netWorth).toBe(140000); // 25000 + 100000 + 10000 + 5000
  });

  it("ne double-compte jamais le réservé dans le patrimoine", () => {
    const s = computeWalletSummary({
      free_savings: 50000,
      disbursed_loan: 0,
      blocked_guarantee: 0,
      mandatory_savings: 0,
      reserved_amount: 20000,
    });
    expect(s.available).toBe(30000); // retenu sur le disponible
    expect(s.netWorth).toBe(50000); // ni −20000, ni +20000 : déjà dans free_savings
  });

  it("portefeuille vide → tout à zéro", () => {
    const s = computeWalletSummary({
      free_savings: 0,
      disbursed_loan: 0,
      blocked_guarantee: 0,
      mandatory_savings: 0,
      reserved_amount: 0,
    });
    expect(s).toEqual({ available: 0, blocked: 0, reserved: 0, netWorth: 0 });
  });
});

import { describe, expect, it } from "vitest";

import { reportToCsv } from "@/lib/admin/financial-report";

describe("reportToCsv", () => {
  it("exporte la synthèse et échappe les cellules", () => {
    const csv = reportToCsv({
      from: "2026-08-01",
      to: "2026-08-31",
      summary: {
        activeLoans: 1,
        completedWithdrawals: 20,
        confirmedDeposits: 100,
        confirmedRepayments: 30,
        defaultedLoans: 0,
        disbursedLoans: 50,
        outstandingPrincipal: 40,
      },
      countries: [{ country: "CI, Côte d’Ivoire", clients: 2, deposits: 100, withdrawals: 20 }],
    });
    expect(csv).toContain("Dépôts confirmés XOF,100");
    expect(csv).toContain('"CI, Côte d’Ivoire",2,100,20');
  });
});

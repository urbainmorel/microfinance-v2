import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoanSimulationCard } from "@/components/loans/loan-simulation-card";

import type { LoanSimulation } from "@/components/loans/loan-request-types";

describe("LoanSimulationCard", () => {
  const mockSimulation: LoanSimulation = {
    totalFees: 15000,
    totalInterest: 20000,
    guaranteeRequired: 50000,
    mandatorySavingsTotal: 10000,
    totalDue: 350000,
    recoverableAmount: 60000,
    schedule: [
      {
        installmentNo: 1,
        dueDate: "2026-10-12",
        principal: 25000,
        interest: 2000,
        fees: 1500,
        mandatorySavings: 1000,
        total: 29500,
      },
      {
        installmentNo: 2,
        dueDate: "2026-11-12",
        principal: 25000,
        interest: 2000,
        fees: 1500,
        mandatorySavings: 1000,
        total: 29500,
      },
    ],
  };

  it("renders 'Votre simulation', 'Total à rembourser', and 'À rembourser par mois :'", () => {
    const html = renderToStaticMarkup(<LoanSimulationCard simulation={mockSimulation} />);

    expect(html).toContain("Votre simulation");
    expect(html).toContain("Total à rembourser");
    expect(html).toContain("À rembourser par mois :");

    // Both values must be present in the markup
    expect(html).toContain("350"); // Total due formatted
    expect(html).toContain("29"); // Monthly installment formatted
  });

  it("falls back to totalDue if schedule is empty", () => {
    const emptyScheduleSimulation: LoanSimulation = {
      ...mockSimulation,
      schedule: [],
    };
    const html = renderToStaticMarkup(<LoanSimulationCard simulation={emptyScheduleSimulation} />);

    expect(html).toContain("Total à rembourser");
    expect(html).toContain("À rembourser par mois :");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoanSimulationCard } from "@/components/loans/loan-simulation-card";

import type { LoanSimulation } from "@/components/loans/loan-request-types";

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

const classic5MSimulation: LoanSimulation = {
  amount: 5000000,
  durationMonths: 60,
  interestRate: 5,
  interestMethod: "CONSTANT_INSTALLMENT",
  totalFees: 0,
  totalInterest: 661371,
  loanTotalRepaid: 5661371,
  monthlyPayment: 94356,
  guaranteeRequired: 250000,
  mandatorySavingsTotal: 283080,
  totalDue: 5944451,
  recoverableAmount: 533080,
  schedule: [
    {
      installmentNo: 1,
      dueDate: "2026-10-26",
      principal: 73523,
      interest: 20833,
      fees: 0,
      loanInstallment: 94356,
      mandatorySavings: 4718,
      total: 99074,
    },
  ],
};

describe("LoanSimulationCard", () => {
  it("renders 'Votre simulation', 'Total à rembourser', and 'À rembourser par mois :'", () => {
    const html = renderToStaticMarkup(<LoanSimulationCard simulation={mockSimulation} />);

    expect(html).toContain("Votre simulation");
    expect(html).toContain("Total à rembourser");
    expect(html).toContain("À rembourser par mois :");

    expect(html).toContain("350");
    expect(html).toContain("29");
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

  it("correctly displays standard 5 000 000 FCFA loan at 5% for 60 months", () => {
    const html = renderToStaticMarkup(<LoanSimulationCard simulation={classic5MSimulation} />);

    expect(html).toContain("94");
    expect(html).toContain("356");
    expect(html).toContain("5");
    expect(html).toContain("661");
    expect(html).toContain("371");
    expect(html).toContain("Total montant récupérable");
    expect(html).toContain("non inclus dans les coûts du prêt");
  });
});

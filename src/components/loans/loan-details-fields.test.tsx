import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { LoanDetailsFields } from "@/components/loans/loan-details-fields";

import type { LoanRequestInput } from "@/lib/schemas/loan";

function Wrapper() {
  const form = useForm<LoanRequestInput>({
    defaultValues: {
      productId: "123e4567-e89b-12d3-a456-426614174000",
      amount: 150000,
      durationMonths: 6,
      startDate: "2026-10-01",
      purpose: "",
      monthlyIncomeEstimate: 250000,
      disbursementMethod: "INTERNAL",
      documents: [],
      acceptedTerms: false,
      pin: "",
    },
  });

  return <LoanDetailsFields form={form} simulationIsFresh={true} onBack={() => {}} />;
}

describe("LoanDetailsFields", () => {
  it("does not render Justificatifs de la demande or Mode de décaissement", () => {
    const html = renderToStaticMarkup(<Wrapper />);

    expect(html).not.toContain("Justificatifs de la demande");
    expect(html).not.toContain("Mode de décaissement");
    expect(html).not.toContain("loan-disbursement");
    expect(html).not.toContain("loan-documents");

    // It should render purpose textarea with autoFocus and id
    expect(html).toContain('id="loan-purpose"');
    expect(html).toContain("autofocus");
    expect(html).toContain("Objet du prêt");

    // It should render income and confirmation pin
    expect(html).toContain('id="loan-income"');
    expect(html).toContain('id="loan-pin"');
  });
});

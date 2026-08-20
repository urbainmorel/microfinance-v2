"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLoanSimulation } from "@/components/loans/use-loan-simulation";
import { useLoanSubmission } from "@/components/loans/use-loan-submission";
import { loanRequestSchema } from "@/lib/schemas/loan";

import type { LoanProduct, LoanRequestInput } from "@/lib/schemas/loan";

export function useLoanRequest(products: LoanProduct[], defaultProductId?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<LoanRequestInput>({
    resolver: zodResolver(loanRequestSchema),
    defaultValues: {
      productId: defaultProductId ?? "",
      startDate: today,
      disbursementMethod: "INTERNAL",
      documents: [],
      acceptedTerms: false,
    },
  });
  const simulation = useLoanSimulation(form, products, setServerError);
  const submission = useLoanSubmission(simulation.simulationIsFresh, setServerError);

  return {
    form,
    today,
    serverError,
    simulation: simulation.simulation,
    simulating: simulation.simulating,
    simulationIsFresh: simulation.simulationIsFresh,
    requestId: submission.requestId,
    simulate: simulation.simulate,
    submit: submission.submit,
  };
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLoanSimulation } from "@/components/loans/use-loan-simulation";
import { useLoanSubmission } from "@/components/loans/use-loan-submission";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { loanRequestSchema } from "@/lib/schemas/loan";

import type { LoanProduct, LoanRequestInput } from "@/lib/schemas/loan";

const PRODUCT_FIELDS =
  "id,name,description,min_amount,max_amount,min_duration_months,max_duration_months,interest_rate,interest_method,processing_fee_percent,processing_fee_flat,management_fee_percent,management_fee_flat,insurance_rate,guarantee_rate,mandatory_savings_rate";

export function useActiveLoanProducts() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["active-loan-products"],
    staleTime: 60_000,
    queryFn: async (): Promise<LoanProduct[]> => {
      const { data, error } = await supabase
        .from("loan_products")
        .select(PRODUCT_FIELDS)
        .eq("is_active", true)
        .order("min_amount", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LoanProduct[];
    },
  });
}

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

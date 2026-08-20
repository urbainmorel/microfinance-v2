"use client";

import { useMemo, useState } from "react";
import { useWatch } from "react-hook-form";

import { useSupabase } from "@/lib/hooks/use-supabase";

import type { LoanSimulation } from "@/components/loans/loan-request-types";
import type { LoanProduct, LoanRequestInput, LoanSimulationInput } from "@/lib/schemas/loan";
import type { UseFormReturn } from "react-hook-form";

function fingerprint(values: LoanSimulationInput) {
  return [values.productId, values.amount, values.durationMonths, values.startDate].join(":");
}

function limitsError(product: LoanProduct | undefined, values: LoanRequestInput) {
  if (!product) return null;
  const amountInvalid = values.amount < product.min_amount || values.amount > product.max_amount;
  const durationInvalid =
    values.durationMonths < product.min_duration_months ||
    values.durationMonths > product.max_duration_months;
  return amountInvalid || durationInvalid
    ? "Le montant ou la durée ne respecte pas les limites du produit choisi."
    : null;
}

export function useLoanSimulation(
  form: UseFormReturn<LoanRequestInput>,
  products: LoanProduct[],
  setError: (message: string | null) => void,
) {
  const supabase = useSupabase();
  const [simulation, setSimulation] = useState<LoanSimulation | null>(null);
  const [simulatedFingerprint, setSimulatedFingerprint] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const watched = useWatch({
    control: form.control,
    name: ["productId", "amount", "durationMonths", "startDate"],
  });
  const currentFingerprint = useMemo(
    () => watched.map((value) => value ?? "").join(":"),
    [watched],
  );
  const simulationIsFresh = Boolean(simulation && simulatedFingerprint === currentFingerprint);

  async function simulate() {
    setError(null);
    if (!(await form.trigger(["productId", "amount", "durationMonths", "startDate"]))) return;
    const values = form.getValues();
    const invalid = limitsError(
      products.find((item) => item.id === values.productId),
      values,
    );
    if (invalid) return setError(invalid);
    setSimulating(true);
    try {
      const { data, error } = await supabase.rpc("simulate_loan", {
        p_product: values.productId,
        p_amount: values.amount,
        p_duration: values.durationMonths,
        p_start_date: values.startDate,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result || typeof result !== "object") throw new Error("Simulation vide");
      setSimulation(result as unknown as LoanSimulation);
      setSimulatedFingerprint(fingerprint(values));
    } catch {
      setSimulation(null);
      setError("La simulation n’a pas pu être calculée. Vérifiez les valeurs et réessayez.");
    } finally {
      setSimulating(false);
    }
  }

  return { simulation, simulating, simulationIsFresh, simulate };
}

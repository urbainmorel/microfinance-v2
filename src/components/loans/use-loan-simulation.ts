"use client";

import { useMemo, useState } from "react";
import { useWatch } from "react-hook-form";

import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";
import {
  formatDurationDisplay,
  getDynamicDurationBounds,
  validateAmountStep,
} from "@/lib/loans/loan-tier-rules";

import type { LoanSimulation } from "@/components/loans/loan-request-types";
import type { LoanProduct, LoanRequestInput, LoanSimulationInput } from "@/lib/schemas/loan";
import type { UseFormReturn } from "react-hook-form";

function fingerprint(values: LoanSimulationInput) {
  return [values.productId, values.amount, values.durationMonths, values.startDate].join(":");
}

function limitsError(product: LoanProduct | undefined, values: LoanRequestInput) {
  if (!product) return null;
  if (values.amount < product.min_amount || values.amount > product.max_amount) {
    return `Le montant demandé doit être compris entre ${formatFcfa(product.min_amount)} et ${formatFcfa(product.max_amount)}.`;
  }
  const stepError = validateAmountStep(product, values.amount);
  if (stepError) return stepError;

  const bounds = getDynamicDurationBounds(product, values.amount);
  if (values.durationMonths < bounds.minDuration || values.durationMonths > bounds.maxDuration) {
    return `Pour ${formatFcfa(values.amount)}, la durée autorisée est de ${formatDurationDisplay(bounds.minDuration)} à ${formatDurationDisplay(bounds.maxDuration)}.`;
  }
  return null;
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

  async function simulate(): Promise<boolean> {
    setError(null);
    if (!(await form.trigger(["productId", "amount", "durationMonths", "startDate"]))) {
      return false;
    }
    const values = form.getValues();
    const invalid = limitsError(
      products.find((item) => item.id === values.productId),
      values,
    );
    if (invalid) {
      setError(invalid);
      return false;
    }
    setSimulating(true);
    try {
      const { data, error } = await supabase.rpc("simulate_loan", {
        p_product: values.productId,
        p_amount: Math.trunc(Number(values.amount)),
        p_duration: Math.trunc(Number(values.durationMonths)),
        p_start_date: values.startDate,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result || typeof result !== "object") throw new Error("Simulation vide");
      setSimulation(result as unknown as LoanSimulation);
      setSimulatedFingerprint(fingerprint(values));
      return true;
    } catch {
      setSimulation(null);
      setError("La simulation n’a pas pu être calculée. Vérifiez les valeurs et réessayez.");
      return false;
    } finally {
      setSimulating(false);
    }
  }

  return { simulation, simulating, simulationIsFresh, simulate };
}

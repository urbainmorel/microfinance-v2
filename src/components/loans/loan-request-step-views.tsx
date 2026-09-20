"use client";

import { ArrowLeft, ArrowRight, Calculator } from "lucide-react";

import { LoanDetailsFields } from "@/components/loans/loan-details-fields";
import { LoanAmountStep, LoanProductStep } from "@/components/loans/loan-request-fields";
import { LoanSimulationCard } from "@/components/loans/loan-simulation-card";
import { useLoanRequest } from "@/components/loans/use-loan-request";
import { Button } from "@/components/ui/button";

import type { LoanProduct, LoanRequestInput } from "@/lib/schemas/loan";
import type { UseFormReturn } from "react-hook-form";

export function StepOneProduct({
  form,
  products,
  onContinue,
}: {
  form: UseFormReturn<LoanRequestInput>;
  products: LoanProduct[];
  onContinue: () => void;
}) {
  return (
    <>
      <LoanProductStep form={form} products={products} />
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="button" variant="accent" onClick={onContinue}>
          Suivant : Montant et durée <ArrowRight aria-hidden />
        </Button>
      </div>
    </>
  );
}

export function StepTwoAmount({
  form,
  products,
  today,
  simulating,
  onBack,
}: {
  form: UseFormReturn<LoanRequestInput>;
  products: LoanProduct[];
  today: string;
  simulating: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <LoanAmountStep form={form} products={products} today={today} />
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft aria-hidden /> Changer d’offre
        </Button>
        <Button type="submit" variant="accent" disabled={simulating} aria-busy={simulating}>
          <Calculator aria-hidden />
          {simulating ? "Calcul en cours…" : "Calculer mon échéancier"}
        </Button>
      </div>
    </>
  );
}

export function StepThreeSimulation({
  simulation,
  onBack,
}: {
  simulation: NonNullable<ReturnType<typeof useLoanRequest>["simulation"]>;
  onBack: () => void;
}) {
  return (
    <>
      <LoanSimulationCard simulation={simulation} />
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft aria-hidden /> Modifier mon besoin
        </Button>
        <Button type="submit" variant="accent">
          Continuer <ArrowRight aria-hidden />
        </Button>
      </div>
    </>
  );
}

export function LoanStepContent({
  step,
  request,
  products,
  setStep,
  continueFromProductStep,
}: {
  step: number;
  request: ReturnType<typeof useLoanRequest>;
  products: LoanProduct[];
  setStep: (s: number) => void;
  continueFromProductStep: () => void;
}) {
  if (step === 0) {
    return (
      <StepOneProduct
        form={request.form}
        products={products}
        onContinue={() => void continueFromProductStep()}
      />
    );
  }
  if (step === 1) {
    return (
      <StepTwoAmount
        form={request.form}
        products={products}
        today={request.today}
        simulating={request.simulating}
        onBack={() => setStep(0)}
      />
    );
  }
  if (step === 2) {
    if (request.simulation) {
      return <StepThreeSimulation simulation={request.simulation} onBack={() => setStep(1)} />;
    }
    return (
      <StepTwoAmount
        form={request.form}
        products={products}
        today={request.today}
        simulating={request.simulating}
        onBack={() => setStep(0)}
      />
    );
  }
  if (step === 3) {
    return (
      <LoanDetailsFields
        form={request.form}
        simulationIsFresh={request.simulationIsFresh}
        onBack={() => setStep(2)}
      />
    );
  }
  return (
    <StepOneProduct
      form={request.form}
      products={products}
      onContinue={() => void continueFromProductStep()}
    />
  );
}

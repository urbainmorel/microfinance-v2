"use client";

import { ArrowLeft, ArrowRight, Calculator, HandCoins } from "lucide-react";
import { useState } from "react";

import { FormError } from "@/components/auth/form-error";
import { RequestSuccess } from "@/components/client/request-page-shell";
import { LoanDetailsFields } from "@/components/loans/loan-details-fields";
import { LoanNeedFields } from "@/components/loans/loan-request-fields";
import { LoanSimulationCard } from "@/components/loans/loan-simulation-card";
import { useActiveLoanProducts, useLoanRequest } from "@/components/loans/use-loan-request";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormStepper } from "@/components/ui/form-stepper";
import { Skeleton } from "@/components/ui/skeleton";

import type { LoanProduct } from "@/lib/schemas/loan";

const LOAN_STEPS = [
  { label: "Besoin", description: "Montant et durée" },
  { label: "Simulation", description: "Coût et échéancier" },
  { label: "Dossier", description: "Pièces et confirmation" },
] as const;

function LoanRequestContent({
  products,
  defaultProductId,
}: {
  products: LoanProduct[];
  defaultProductId?: string;
}) {
  const request = useLoanRequest(products, defaultProductId);
  const [step, setStep] = useState(0);

  async function continueToSimulation() {
    if (await request.simulate()) setStep(1);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (step === 0) {
      event.preventDefault();
      void continueToSimulation();
      return;
    }
    if (step === 1) {
      event.preventDefault();
      if (request.simulationIsFresh) setStep(2);
      return;
    }
    void request.form.handleSubmit(request.submit)(event);
  }

  if (request.requestId)
    return (
      <RequestSuccess
        title="Demande de prêt envoyée"
        reference={request.requestId}
        href="/client/loans"
        linkLabel="Voir mes prêts"
      />
    );
  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <FormStepper steps={LOAN_STEPS} currentStep={step} />
      <FormError message={request.serverError} />
      {step === 0 ? (
        <>
          <LoanNeedFields form={request.form} products={products} today={request.today} />
          <div className="flex justify-end border-t border-border pt-4">
            <Button
              type="submit"
              variant="accent"
              disabled={request.simulating}
              aria-busy={request.simulating}
            >
              <Calculator aria-hidden />
              {request.simulating ? "Calcul en cours…" : "Calculer ma simulation"}
            </Button>
          </div>
        </>
      ) : null}
      {step === 1 && request.simulationIsFresh && request.simulation ? (
        <>
          <LoanSimulationCard simulation={request.simulation} />
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft aria-hidden /> Modifier mon besoin
            </Button>
            <Button type="submit" variant="accent">
              Continuer avec cette simulation <ArrowRight aria-hidden />
            </Button>
          </div>
        </>
      ) : null}
      {step === 2 ? (
        <LoanDetailsFields
          form={request.form}
          simulationIsFresh={request.simulationIsFresh}
          onBack={() => setStep(1)}
        />
      ) : null}
    </form>
  );
}

export function LoanRequestForm({ defaultProductId }: { defaultProductId?: string }) {
  const products = useActiveLoanProducts();
  if (products.isPending) return <Skeleton className="h-[520px] w-full rounded-2xl" />;
  if (products.isError || !products.data)
    return <FormError message="Les produits de prêt sont indisponibles pour le moment." />;
  if (!products.data.length)
    return (
      <EmptyState
        icon={HandCoins}
        title="Aucune offre disponible"
        hint="De nouveaux produits de prêt seront proposés prochainement."
      />
    );
  return <LoanRequestContent products={products.data} defaultProductId={defaultProductId} />;
}

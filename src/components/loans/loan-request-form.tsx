"use client";

import { HandCoins } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FormError } from "@/components/auth/form-error";
import { LoanProcessingStatus } from "@/components/loans/loan-processing-status";
import { LoanRequestExistingNotice } from "@/components/loans/loan-request-existing-notice";
import { LoanStepContent } from "@/components/loans/loan-request-step-views";
import { useActiveLoanProducts, useLoanRequest } from "@/components/loans/use-loan-request";
import { EmptyState } from "@/components/ui/empty-state";
import { FormStepper } from "@/components/ui/form-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveLoan } from "@/lib/hooks/use-active-loan";

import type { LoanProduct } from "@/lib/schemas/loan";

const LOAN_STEPS = [
  { label: "Produit", description: "Choix de l’offre" },
  { label: "Montant & Durée", description: "Montant, durée et date" },
  { label: "Simulation", description: "Coût et échéancier" },
  { label: "Dossier", description: "Pièces et confirmation" },
] as const;

function scrollContainerToTop(element: HTMLElement | null) {
  if (!element) return;
  let current: HTMLElement | null = element.parentElement;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    if (style.overflowY === "auto" || style.overflowY === "scroll") {
      current.scrollTop = 0;
      break;
    }
    current = current.parentElement;
  }
  element.scrollIntoView({ behavior: "instant", block: "start" });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function useStepScrollToTop(
  containerRef: React.RefObject<HTMLDivElement | null>,
  step: number,
  requestId?: string | null,
) {
  useEffect(() => {
    const performScroll = () => scrollContainerToTop(containerRef.current);
    performScroll();
    const rafId = requestAnimationFrame(performScroll);
    const timeoutId = setTimeout(performScroll, 60);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [containerRef, step, requestId]);
}

function LoanRequestContent({
  products,
  defaultProductId,
  onClose,
}: {
  products: LoanProduct[];
  defaultProductId?: string;
  onClose?: () => void;
}) {
  const request = useLoanRequest(products, defaultProductId);
  const [step, setStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useStepScrollToTop(containerRef, step, request.requestId);

  async function continueFromProductStep() {
    const isValid = await request.form.trigger("productId");
    if (isValid) setStep(1);
  }

  async function continueToSimulation() {
    const isValid = await request.form.trigger([
      "productId",
      "amount",
      "durationMonths",
      "startDate",
    ]);
    if (isValid && (await request.simulate())) setStep(2);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 0) {
      void continueFromProductStep();
      return;
    }
    if (step === 1) {
      void continueToSimulation();
      return;
    }
    if (step === 2) {
      if (request.simulationIsFresh) setStep(3);
      else void continueToSimulation();
      return;
    }
    void request.form.handleSubmit(request.submit)(event);
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      {request.requestId ? (
        <LoanProcessingStatus requestId={request.requestId} onClose={onClose} />
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <FormStepper steps={LOAN_STEPS} currentStep={step} />
          <FormError message={request.serverError} />
          <LoanStepContent
            step={step}
            request={request}
            products={products}
            setStep={setStep}
            continueFromProductStep={continueFromProductStep}
          />
        </form>
      )}
    </div>
  );
}

function LoanRequestGate({
  activeLoan,
  onClose,
  children,
}: {
  activeLoan: ReturnType<typeof useActiveLoan>;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const [initialHasExisting] = useState(() => {
    if (!activeLoan.data) return false;
    return [2, 3, 4, 5, 6, 7, 8].includes(activeLoan.data.displayState);
  });

  if (initialHasExisting && activeLoan.data) {
    return <LoanRequestExistingNotice state={activeLoan.data} onClose={onClose} />;
  }

  return <>{children}</>;
}

export function LoanRequestForm({
  defaultProductId,
  onClose,
}: {
  defaultProductId?: string;
  onClose?: () => void;
}) {
  const products = useActiveLoanProducts();
  const activeLoan = useActiveLoan({ refetchInterval: false });

  if (products.isPending || activeLoan.isPending) {
    return <Skeleton className="h-[520px] w-full rounded-2xl" />;
  }
  if (products.isError || !products.data) {
    return <FormError message="Les produits de prêt sont indisponibles pour le moment." />;
  }
  if (!products.data.length) {
    return (
      <EmptyState
        icon={HandCoins}
        title="Aucune offre disponible"
        hint="De nouveaux produits de prêt seront proposés prochainement."
      />
    );
  }
  return (
    <LoanRequestGate activeLoan={activeLoan} onClose={onClose}>
      <LoanRequestContent
        products={products.data}
        defaultProductId={defaultProductId}
        onClose={onClose}
      />
    </LoanRequestGate>
  );
}

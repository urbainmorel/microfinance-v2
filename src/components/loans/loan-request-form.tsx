"use client";

import { FormError } from "@/components/auth/form-error";
import { RequestSuccess } from "@/components/client/request-page-shell";
import { LoanDetailsFields } from "@/components/loans/loan-details-fields";
import { LoanProducts, useActiveLoanProducts } from "@/components/loans/loan-products";
import { LoanNeedFields } from "@/components/loans/loan-request-fields";
import { LoanSimulationCard } from "@/components/loans/loan-simulation-card";
import { useLoanRequest } from "@/components/loans/use-loan-request";
import { Skeleton } from "@/components/ui/skeleton";

import type { LoanProduct } from "@/lib/schemas/loan";

function LoanRequestContent({
  products,
  defaultProductId,
}: {
  products: LoanProduct[];
  defaultProductId?: string;
}) {
  const request = useLoanRequest(products, defaultProductId);
  if (request.requestId)
    return <RequestSuccess title="Demande de prêt envoyée" reference={request.requestId} />;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={request.form.handleSubmit(request.submit)}
      noValidate
    >
      <FormError message={request.serverError} />
      <LoanNeedFields
        form={request.form}
        products={products}
        today={request.today}
        simulating={request.simulating}
        onSimulate={request.simulate}
      />
      {request.simulationIsFresh && request.simulation ? (
        <LoanSimulationCard simulation={request.simulation} />
      ) : null}
      <LoanDetailsFields form={request.form} simulationIsFresh={request.simulationIsFresh} />
    </form>
  );
}

export function LoanRequestForm({ defaultProductId }: { defaultProductId?: string }) {
  const products = useActiveLoanProducts();
  if (products.isPending) return <Skeleton className="h-[520px] w-full rounded-2xl" />;
  if (products.isError || !products.data)
    return <FormError message="Les produits de prêt sont indisponibles pour le moment." />;
  if (!products.data.length) return <LoanProducts />;
  return <LoanRequestContent products={products.data} defaultProductId={defaultProductId} />;
}

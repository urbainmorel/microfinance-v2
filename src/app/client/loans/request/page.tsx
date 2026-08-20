import { RequestPageShell } from "@/components/client/request-page-shell";
import { LoanRequestForm } from "@/components/loans/loan-request-form";

export default async function LoanRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  return (
    <RequestPageShell
      title="Demander un prêt"
      description="Simulez l’échéancier, ajoutez vos justificatifs puis confirmez la demande avec votre PIN."
      backHref="/client/loans"
    >
      <LoanRequestForm defaultProductId={product} />
    </RequestPageShell>
  );
}

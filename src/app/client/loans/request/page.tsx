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
      description="Consultez votre échéancier et validez votre contrat avec votre PIN pour un versement immédiat."
      backHref="/client/loans"
    >
      <LoanRequestForm defaultProductId={product} />
    </RequestPageShell>
  );
}

import { RequestPageShell } from "@/components/client/request-page-shell";
import { RepaymentRequestForm } from "@/components/operations/repayment-request-form";

export default function RepaymentRequestPage() {
  return (
    <RequestPageShell
      title="Rembourser mon prêt"
      description="Envoyez votre paiement et son justificatif. La caisse l’affectera aux échéances les plus anciennes."
      backHref="/client/loans"
    >
      <RepaymentRequestForm />
    </RequestPageShell>
  );
}

import { RequestPageShell } from "@/components/client/request-page-shell";
import { DepositRequestForm } from "@/components/operations/deposit-request-form";

export default function DepositRequestPage() {
  return (
    <RequestPageShell
      title="Faire un dépôt"
      description="Envoyez votre justificatif. Un agent confirmera ensuite le crédit de votre portefeuille."
      backHref="/client/dashboard"
    >
      <DepositRequestForm />
    </RequestPageShell>
  );
}

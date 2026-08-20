import { RequestPageShell } from "@/components/client/request-page-shell";
import { WithdrawalRequestForm } from "@/components/operations/withdrawal-request-form";

export default function BankWithdrawalPage() {
  return (
    <RequestPageShell
      title="Virement bancaire"
      description="Indiquez le compte bénéficiaire. La caisse exécutera le virement après vérification."
      backHref="/client/dashboard"
    >
      <WithdrawalRequestForm type="BANK_TRANSFER" />
    </RequestPageShell>
  );
}

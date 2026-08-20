import { RequestPageShell } from "@/components/client/request-page-shell";
import { WithdrawalRequestForm } from "@/components/operations/withdrawal-request-form";

export default function MobileMoneyWithdrawalPage() {
  return (
    <RequestPageShell
      title="Retrait Mobile Money"
      description="Le montant sera envoyé au numéro Mobile Money indiqué après traitement par la caisse."
      backHref="/client/dashboard"
    >
      <WithdrawalRequestForm type="MOBILE_MONEY" />
    </RequestPageShell>
  );
}

import { RequestPageShell } from "@/components/client/request-page-shell";
import { DepositRequestForm } from "@/components/operations/deposit-request-form";

export default async function DepositRequestPage({
  searchParams,
}: {
  searchParams?: Promise<{ motif?: string; amount?: string }>;
}) {
  const params = await searchParams;
  const isGuarantee = params?.motif === "GUARANTEE";
  const rawAmount = params?.amount ? Number(params.amount) : undefined;
  const defaultAmount =
    rawAmount !== undefined && Number.isFinite(rawAmount) && rawAmount > 0
      ? Math.trunc(rawAmount)
      : undefined;
  return (
    <RequestPageShell
      title={isGuarantee ? "Faire votre « dépôt de garantie »" : "Déposer une épargne"}
      description={
        isGuarantee
          ? undefined
          : "Envoyez votre capture Mobile Money pour alimenter votre épargne libre."
      }
      backHref="/client/dashboard"
    >
      <DepositRequestForm
        defaultMotif={isGuarantee ? "GUARANTEE" : "FREE_SAVINGS"}
        lockMotif={isGuarantee}
        defaultAmount={defaultAmount}
      />
    </RequestPageShell>
  );
}

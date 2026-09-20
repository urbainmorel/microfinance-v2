import { Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { formatFcfa } from "@/lib/format";

import type { ActiveLoanState } from "@/lib/hooks/use-active-loan";

export function extractGuaranteeState(loan?: ActiveLoanState | null) {
  const remaining = loan?.remainingGuarantee ?? 0;
  const withdrawable = loan?.withdrawableAmount ?? 0;
  const hasPending = Boolean(loan?.guaranteeRequired) && !loan?.guaranteeSatisfied && remaining > 0;
  return {
    remainingGuarantee: remaining,
    withdrawableAmount: withdrawable,
    hasPendingGuarantee: hasPending,
    totalAmount: loan?.totalAmount ?? 0,
  };
}

export function checkWithdrawalGuarantee(
  hasPending: boolean,
  amount: number,
  withdrawable: number,
  remaining: number,
): string | null {
  if (hasPending) {
    return `Le retrait est impossible tant que votre dépôt de garantie de ${formatFcfa(remaining)} n’a pas été constitué.`;
  }
  if (withdrawable > 0 && amount > withdrawable) {
    return `Le montant demandé (${formatFcfa(amount)}) dépasse votre solde retirable disponible de ${formatFcfa(withdrawable)}.`;
  }
  return null;
}

export function GuaranteeBlockedWithdrawalNotice({
  remainingGuarantee,
}: {
  remainingGuarantee: number;
}) {
  return (
    <Card className="flex flex-col gap-4 p-6 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <Lock className="size-6" aria-hidden />
      </div>
      <h3 className="font-display text-lg font-bold text-foreground">
        Dépôt de garantie requis pour retirer
      </h3>
      <p className="text-sm text-muted-foreground">
        Votre prêt est crédité sur votre compte, mais son retrait est conditionné par la
        constitution du dépôt de garantie obligatoire de{" "}
        <strong className="text-foreground">{formatFcfa(remainingGuarantee)}</strong>.
      </p>
      <div className="mx-auto flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        Garantie 100% récupérable à la fin du prêt
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href={`/client/deposit/request?motif=GUARANTEE&amount=${remainingGuarantee}`}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition hover:opacity-90"
        >
          Déposer ma garantie ({formatFcfa(remainingGuarantee)})
        </Link>
        <Link
          href="/client/dashboard"
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </Card>
  );
}

export function LoanGuaranteeReserveWarning({
  withdrawableAmount,
  totalAmount,
  remainingGuarantee,
}: {
  withdrawableAmount: number;
  totalAmount: number;
  remainingGuarantee: number;
}) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-finance-soft/50 p-4 text-xs leading-5 text-foreground">
      <p className="font-bold text-accent">Attention : fonds de prêt en réserve de garantie</p>
      <p className="mt-0.5 text-muted-foreground">
        Seule votre épargne libre de{" "}
        <strong className="text-foreground">{formatFcfa(withdrawableAmount)}</strong> est
        actuellement retirable. Votre prêt de {formatFcfa(totalAmount)} sera débloqué après le
        versement de la garantie ({formatFcfa(remainingGuarantee)}).
      </p>
    </div>
  );
}

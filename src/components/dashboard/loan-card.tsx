"use client";

import { HandCoins, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { GuaranteeActions } from "@/components/dashboard/guarantee-actions-modal";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFcfa } from "@/lib/format";
import { useActiveLoan, type ActiveLoanState } from "@/lib/hooks/use-active-loan";
import { getLoanCardCopy } from "@/lib/loans/loan-status-copy";
import { cn } from "@/lib/utils";

function LoanScheduleAndRepayLinks({ loanId }: { loanId?: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {loanId ? (
        <Link
          href={`/client/loans/${loanId}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Voir l’échéancier
        </Link>
      ) : null}
      <Link
        href="/client/repay/request"
        className={buttonVariants({ variant: "accent", size: "sm" })}
      >
        Rembourser mon prêt
      </Link>
    </div>
  );
}

function LoanAction({ state }: { state: ActiveLoanState }) {
  const remaining = Math.max((state.guaranteeRequired ?? 0) - (state.guaranteeBlocked ?? 0), 0);
  if ([4, 5, 6].includes(state.displayState) && !state.contractSigned && state.requestId) {
    return (
      <Link
        href={`/client/loans/contracts/${state.requestId}`}
        className={cn(buttonVariants({ variant: "accent", size: "sm" }), "mt-4 w-full")}
      >
        Lire et signer mon contrat
      </Link>
    );
  }
  if (state.displayState === 4 || state.displayState === 5) {
    return <GuaranteeActions state={state} />;
  }
  if (state.displayState === 7 && remaining > 0) {
    return (
      <div className="flex flex-col gap-2">
        <GuaranteeActions state={state} />
        <div className="mt-2">
          <LoanScheduleAndRepayLinks loanId={state.loanId} />
        </div>
      </div>
    );
  }
  if (state.displayState === 7 || state.displayState === 8) {
    return (
      <div className="mt-4">
        <LoanScheduleAndRepayLinks loanId={state.loanId} />
      </div>
    );
  }
  return null;
}

export function LoanCard() {
  const query = useActiveLoan();
  if (query.isPending) return <Skeleton className="h-[170px] w-full rounded-2xl" />;
  const state = query.data ?? { displayState: 1 };
  const remaining = Math.max((state.guaranteeRequired ?? 0) - (state.guaranteeBlocked ?? 0), 0);
  const copy = getLoanCardCopy(state.displayState, remaining, state.contractSigned);

  return (
    <Card className="flex h-full min-h-[280px] flex-col p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-finance-soft text-accent">
          <HandCoins className="size-[18px]" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Mon prêt
        </span>
      </div>

      <p className="mt-5 font-display text-xl font-bold tracking-[-0.025em] text-foreground">
        {copy.title}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.body}</p>

      {state.remainingPrincipal === undefined && remaining <= 0 ? null : (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {state.remainingPrincipal === undefined ? null : (
            <div className="rounded-xl bg-muted/75 p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">Capital restant</p>
              <p className="mt-1 font-display text-sm font-bold [font-variant-numeric:tabular-nums]">
                {formatFcfa(state.remainingPrincipal)}
              </p>
            </div>
          )}
          {remaining > 0 ? (
            <div className="rounded-xl bg-muted/75 p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">Garantie restante</p>
              <p className="mt-1 font-display text-sm font-bold [font-variant-numeric:tabular-nums]">
                {formatFcfa(remaining)}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3 shrink-0" aria-hidden />
                100% récupérable à la fin du prêt
              </p>
            </div>
          ) : null}
        </div>
      )}
      <div className="mt-auto pt-1">
        <LoanAction state={state} />
      </div>
    </Card>
  );
}

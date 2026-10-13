"use client";

import { ArrowRight, Clock, Lock } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatFcfa } from "@/lib/format";
import { useActiveLoan } from "@/lib/hooks/use-active-loan";
import { usePendingGuaranteeDeposit } from "@/lib/hooks/use-pending-guarantee-deposit";
import { cn } from "@/lib/utils";

function GuaranteeBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/20 dark:text-amber-300">
        <Lock className="size-3 shrink-0" aria-hidden />
        Action requise
      </span>
    </div>
  );
}

function GuaranteePendingVerificationBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-bold text-blue-900 dark:border-blue-500/25 dark:bg-blue-500/20 dark:text-blue-300">
        <Clock className="size-3 shrink-0" aria-hidden />
        Vérification en cours
      </span>
    </div>
  );
}

export function GuaranteePendingVerificationBanner({ amount }: { amount?: number }) {
  return (
    <aside
      aria-label="Statut du dépôt de garantie en cours de vérification"
      className="relative overflow-hidden rounded-[20px] border border-blue-500/30 bg-[linear-gradient(135deg,rgba(239,246,255,0.95)_0%,rgba(219,234,254,0.55)_100%)] p-5 text-foreground shadow-sm dark:border-blue-500/25 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.95)_0%,rgba(30,58,138,0.25)_100%)] sm:p-6"
    >
      <div className="flex flex-col gap-3.5">
        <GuaranteePendingVerificationBadges />

        <div className="min-w-0">
          <h3 className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
            Dépôt de garantie en cours de vérification
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-[13px]">
            Votre versement de dépôt de garantie{" "}
            {amount ? <strong className="text-foreground">{formatFcfa(amount)}</strong> : null} a
            bien été reçu et est actuellement en cours de vérification par nos services. Vos
            retraits seront automatiquement débloqués dès sa validation.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-0.5 sm:flex-row sm:items-center">
          <Link
            href="/client/operations"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "shadow-xs gap-2 font-bold sm:w-auto",
            )}
          >
            <span>Suivre mes opérations</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
          <p className="text-xs text-muted-foreground sm:ml-2">
            Validation sous quelques instants à quelques heures
          </p>
        </div>
      </div>
    </aside>
  );
}

export function GuaranteeActionRequiredBanner({
  remainingGuarantee,
}: {
  remainingGuarantee: number;
}) {
  const depositUrl = `/client/deposit/request?motif=GUARANTEE&amount=${remainingGuarantee}`;

  return (
    <aside
      aria-label="Constitution de votre dépôt de garantie obligatoire"
      className="relative overflow-hidden rounded-[20px] border border-amber-500/30 bg-[linear-gradient(135deg,rgba(255,251,235,0.95)_0%,rgba(254,243,199,0.55)_100%)] p-5 text-foreground shadow-sm dark:border-amber-500/25 dark:bg-[linear-gradient(135deg,rgba(35,26,10,0.95)_0%,rgba(48,34,14,0.70)_100%)] sm:p-6"
    >
      <div className="flex flex-col gap-3.5">
        <GuaranteeBadges />

        <div className="min-w-0">
          <h3 className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
            Dépôt de garantie obligatoire pour débloquer vos retraits
          </h3>
        </div>

        <div className="flex flex-col gap-2.5 pt-0.5 sm:flex-row sm:items-center">
          <Link
            href={depositUrl}
            className={cn(
              buttonVariants({ variant: "accent", size: "default" }),
              "gap-2 font-bold shadow-sm sm:w-auto",
            )}
          >
            <span>Faire mon « dépôt de garantie » ({formatFcfa(remainingGuarantee)})</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
          <p className="text-xs text-muted-foreground sm:ml-2">
            Versement direct par Mobile Money · Déblocage immédiat
          </p>
        </div>
      </div>
    </aside>
  );
}

function hasPendingGuarantee(loan: ReturnType<typeof useActiveLoan>["data"]) {
  if (!loan?.guaranteeRequired || loan.guaranteeSatisfied) {
    return false;
  }
  return (loan.remainingGuarantee ?? 0) > 0;
}

export function GuaranteeReminderBanner() {
  const { data: loan, isPending: isPendingLoan } = useActiveLoan();
  const { data: pendingDeposit, isPending: isPendingDeposit } = usePendingGuaranteeDeposit();

  if (isPendingLoan || isPendingDeposit || !loan || !hasPendingGuarantee(loan)) {
    return null;
  }

  if (pendingDeposit) {
    return <GuaranteePendingVerificationBanner amount={pendingDeposit.amount} />;
  }

  return <GuaranteeActionRequiredBanner remainingGuarantee={loan.remainingGuarantee ?? 0} />;
}

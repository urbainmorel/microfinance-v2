"use client";

import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatFcfa } from "@/lib/format";
import { useActiveLoan } from "@/lib/hooks/use-active-loan";
import { cn } from "@/lib/utils";

function GuaranteeBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/20 dark:text-amber-300">
        <Lock className="size-3 shrink-0" aria-hidden />
        Action requise · Retraits temporairement verrouillés
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        <ShieldCheck className="size-3 shrink-0" aria-hidden />
        100% remboursable à l’échéance
      </span>
    </div>
  );
}

export function GuaranteeReminderBanner() {
  const { data: loan } = useActiveLoan();

  const hasPendingGuarantee =
    Boolean(loan?.guaranteeRequired) &&
    !loan?.guaranteeSatisfied &&
    (loan?.remainingGuarantee ?? 0) > 0;

  if (!hasPendingGuarantee || !loan) {
    return null;
  }

  const remainingGuarantee = loan.remainingGuarantee ?? 0;
  const depositUrl = `/client/deposit/request?motif=GUARANTEE&amount=${remainingGuarantee}`;

  return (
    <aside
      aria-label="Constitution de votre garantie obligatoire"
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
            <span>Déposer ma garantie ({formatFcfa(remainingGuarantee)})</span>
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

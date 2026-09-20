"use client";

import { ArrowRight, BadgeCheck, FileSignature } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatFcfa } from "@/lib/format";
import { useActiveLoan } from "@/lib/hooks/use-active-loan";
import { cn } from "@/lib/utils";

export function ContractPendingBanner() {
  const { data: loan } = useActiveLoan();

  const isContractPending =
    Boolean(loan?.requestId) && !loan?.contractSigned && loan?.displayState === 4;

  if (!isContractPending || !loan?.requestId) {
    return null;
  }

  const totalAmount = loan.totalAmount ?? 0;
  const contractUrl = `/client/loans/contract/${loan.requestId}`;

  return (
    <aside
      aria-label="Signature du contrat de prêt en attente"
      className="relative overflow-hidden rounded-[20px] border border-accent/30 bg-[linear-gradient(135deg,rgba(240,253,244,0.95)_0%,rgba(220,252,231,0.55)_100%)] p-5 text-foreground shadow-sm dark:border-accent/25 dark:bg-[linear-gradient(135deg,rgba(10,30,20,0.95)_0%,rgba(15,40,25,0.70)_100%)] sm:p-6"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold text-accent">
            <FileSignature className="size-3 shrink-0" aria-hidden />
            Prêt approuvé · Signature officielle en attente
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <BadgeCheck className="size-3 shrink-0" aria-hidden />
            Dossier validé
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
            Finalisez votre financement : signez votre contrat officiel
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-[13px]">
            Votre demande de financement{" "}
            {totalAmount ? (
              <strong className="text-foreground">{formatFcfa(totalAmount)}</strong>
            ) : (
              ""
            )}{" "}
            a été approuvée par notre système. Consultez les clauses contractuelles et confirmez
            avec votre code PIN pour déclencher la mise à disposition des fonds.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-center">
          <Link
            href={contractUrl}
            className={cn(
              buttonVariants({ variant: "accent", size: "default" }),
              "gap-2 font-bold shadow-sm sm:w-auto",
            )}
          >
            <span>Consulter et signer mon contrat</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
          <p className="text-[11px] text-muted-foreground sm:ml-2">
            Signature électronique légale · Sans engagement jusqu’à signature
          </p>
        </div>
      </div>
    </aside>
  );
}

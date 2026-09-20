"use client";

import { ArrowRight, Clock, FileSignature, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { ActiveLoanState } from "@/lib/hooks/use-active-loan";

function ContractPendingContent({
  requestId,
  amount,
  onClose,
}: {
  requestId: string;
  amount?: number;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-4 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
        <FileSignature className="size-6" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">
          Demande approuvée · Signature requise
        </h3>
        <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Votre financement {amount ? <strong>{formatFcfa(amount)}</strong> : "demandé"} a été
          approuvé. Signez électroniquement votre contrat pour débloquer les fonds.
        </p>
      </div>
      <div className="flex flex-col-reverse justify-center gap-2 pt-2 sm:flex-row">
        {onClose ? (
          <button
            type="button"
            className={buttonVariants({ variant: "outline", size: "sm" })}
            onClick={onClose}
          >
            Fermer
          </button>
        ) : null}
        <Link
          href={`/client/loans/contract/${requestId}`}
          onClick={onClose}
          className={cn(buttonVariants({ variant: "accent", size: "sm" }), "gap-2")}
        >
          <span>Consulter et signer mon contrat</span>
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function InReviewContent({ amount, onClose }: { amount?: number; onClose?: () => void }) {
  return (
    <div className="space-y-4 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Clock className="size-6" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">
          Demande de prêt en cours d’examen
        </h3>
        <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Votre dossier {amount ? <strong>{formatFcfa(amount)}</strong> : ""} est en cours
          d’évaluation. Une seule demande peut être instruite à la fois.
        </p>
      </div>
      <div className="flex justify-center gap-2 pt-2">
        <Link
          href="/client/loans"
          onClick={onClose}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Voir mes demandes
        </Link>
      </div>
    </div>
  );
}

function ActiveLoanContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="space-y-4 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
        <ShieldCheck className="size-6" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">
          Vous avez déjà un prêt actif
        </h3>
        <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Conformément à notre politique d’octroi responsable, vous devez solder votre prêt en cours
          avant de formuler une nouvelle demande.
        </p>
      </div>
      <div className="flex justify-center gap-2 pt-2">
        <Link
          href="/client/loans"
          onClick={onClose}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Consulter mon prêt en cours
        </Link>
      </div>
    </div>
  );
}

export function LoanRequestExistingNotice({
  state,
  onClose,
}: {
  state: ActiveLoanState;
  onClose?: () => void;
}) {
  const isContractPending =
    Boolean(state.requestId) && !state.contractSigned && [4, 5, 6].includes(state.displayState);

  return (
    <Card className="border-border bg-card p-6 shadow-sm sm:p-8">
      {isContractPending && state.requestId ? (
        <ContractPendingContent
          requestId={state.requestId}
          amount={state.totalAmount}
          onClose={onClose}
        />
      ) : [2, 3].includes(state.displayState) ? (
        <InReviewContent amount={state.totalAmount} onClose={onClose} />
      ) : (
        <ActiveLoanContent onClose={onClose} />
      )}
    </Card>
  );
}

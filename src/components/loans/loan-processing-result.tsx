import { ArrowRight, CheckCircle2, FileCheck2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatFcfa } from "@/lib/format";

type LoanRequestData =
  | {
      id: string;
      status: string | null;
      amount: number;
      approved_amount: number | null;
    }
  | null
  | undefined;

type ResultProps = {
  requestId: string;
  loanRequest: LoanRequestData;
  onGoToWallet: () => void;
  onGoToContract: () => void;
  onGoToLoans: () => void;
};

function ResultSyncingCard({ onGoToLoans }: { onGoToLoans: () => void }) {
  return (
    <Card
      role="status"
      aria-live="polite"
      className="space-y-6 px-6 py-10 text-center animate-in fade-in-50 zoom-in-95"
    >
      <Loader2 className="mx-auto size-10 animate-spin text-accent" />
      <div className="space-y-1">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          Finalisation de l’analyse…
        </h2>
        <p className="text-xs text-muted-foreground">
          Synchronisation des données du dossier en cours.
        </p>
      </div>
      <div className="pt-2">
        <Button variant="outline" size="sm" onClick={onGoToLoans}>
          Accéder à mes demandes
        </Button>
      </div>
    </Card>
  );
}

function ResultApprovalCard({
  requestId,
  amount,
  onGoToWallet,
  onGoToContract,
}: {
  requestId: string;
  amount: number | null;
  onGoToWallet: () => void;
  onGoToContract: () => void;
}) {
  return (
    <Card
      role="status"
      aria-live="polite"
      className="space-y-6 px-6 py-10 text-center animate-in fade-in-50 zoom-in-95"
    >
      <span className="shadow-xs mx-auto grid size-16 place-items-center rounded-2xl bg-finance-soft text-accent">
        <CheckCircle2 className="size-8" strokeWidth={2.2} aria-hidden />
      </span>
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Félicitations ! Votre demande est approuvée
        </h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Votre dossier de financement{" "}
          {amount ? <strong className="text-foreground">{formatFcfa(amount)}</strong> : ""} a été
          validé avec succès par notre système d’analyse. Veuillez maintenant consulter et signer
          votre contrat officiel pour déclencher le versement des fonds sur votre portefeuille.
        </p>
      </div>
      <div className="mx-auto max-w-sm rounded-xl border border-border bg-muted/40 p-4 text-left text-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <span className="text-muted-foreground">Référence dossier</span>
          <span className="font-mono font-semibold text-foreground">{requestId}</span>
        </div>
        <div className="flex items-center justify-between pt-2.5">
          <span className="text-muted-foreground">Statut de la demande</span>
          <span className="font-semibold text-accent">Prêt validé · En attente de signature</span>
        </div>
      </div>
      <div className="flex flex-col-reverse justify-center gap-3 pt-2 sm:flex-row sm:items-center">
        <Button variant="outline" onClick={onGoToWallet}>
          Retour au tableau de bord
        </Button>
        <Button variant="accent" onClick={onGoToContract} className="gap-2 font-semibold">
          Consulter et signer mon contrat <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

function ResultDisbursedCard({
  requestId,
  amount,
  onGoToWallet,
  onGoToLoans,
}: {
  requestId: string;
  amount: number | null;
  onGoToWallet: () => void;
  onGoToLoans: () => void;
}) {
  return (
    <Card
      role="status"
      aria-live="polite"
      className="space-y-6 px-6 py-10 text-center animate-in fade-in-50 zoom-in-95"
    >
      <span className="shadow-xs mx-auto grid size-16 place-items-center rounded-2xl bg-finance-soft text-accent">
        <CheckCircle2 className="size-8" strokeWidth={2.2} aria-hidden />
      </span>
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Prêt approuvé et crédité !
        </h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Félicitations ! Votre demande de financement{" "}
          {amount ? <strong className="text-foreground">{formatFcfa(amount)}</strong> : ""} a été
          validée automatiquement et les fonds sont déjà disponibles sur votre portefeuille.
        </p>
      </div>
      <div className="mx-auto max-w-sm rounded-xl border border-border bg-muted/40 p-4 text-left text-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <span className="text-muted-foreground">Référence dossier</span>
          <span className="font-mono font-semibold text-foreground">{requestId}</span>
        </div>
        <div className="flex items-center justify-between pt-2.5">
          <span className="text-muted-foreground">Statut des fonds</span>
          <span className="font-semibold text-accent">Crédités sur votre portefeuille</span>
        </div>
      </div>
      <div className="flex flex-col-reverse justify-center gap-3 pt-2 sm:flex-row sm:items-center">
        <Button variant="outline" onClick={onGoToLoans}>
          Suivre mon prêt
        </Button>
        <Button variant="accent" onClick={onGoToWallet} className="gap-2 font-semibold">
          Voir mon portefeuille <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

function ResultRejectedCard({ onGoToWallet }: { onGoToWallet: () => void }) {
  return (
    <Card
      role="status"
      aria-live="polite"
      className="space-y-6 px-6 py-10 text-center animate-in fade-in-50 zoom-in-95"
    >
      <span className="shadow-xs mx-auto grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <XCircle className="size-8" strokeWidth={2.2} aria-hidden />
      </span>
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Demande non retenue
        </h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Votre dossier n’a pas pu être validé favorablement par nos critères d’octroi actuels. Vous
          pouvez vous rapprocher de votre agence ou soumettre une nouvelle demande ultérieurement.
        </p>
      </div>
      <div className="flex justify-center gap-3 pt-2">
        <Button variant="outline" onClick={onGoToWallet}>
          Retour au tableau de bord
        </Button>
      </div>
    </Card>
  );
}

function ResultManualCard({
  requestId,
  amount,
  onGoToWallet,
  onGoToLoans,
}: {
  requestId: string;
  amount: number | null;
  onGoToWallet: () => void;
  onGoToLoans: () => void;
}) {
  return (
    <Card
      role="status"
      aria-live="polite"
      className="space-y-6 px-6 py-10 text-center animate-in fade-in-50 zoom-in-95"
    >
      <span className="shadow-xs mx-auto grid size-16 place-items-center rounded-2xl bg-accent/10 text-accent">
        <FileCheck2 className="size-8" strokeWidth={2.2} aria-hidden />
      </span>
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Demande transmise avec succès !
        </h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Votre demande de prêt{" "}
          {amount ? <strong className="text-foreground">{formatFcfa(amount)}</strong> : ""} a été
          transmise avec succès. Votre dossier est actuellement entre les mains de notre comité
          d’octroi pour étude manuelle.
        </p>
      </div>
      <div className="mx-auto max-w-sm rounded-xl border border-border bg-muted/40 p-4 text-left text-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <span className="text-muted-foreground">Référence dossier</span>
          <span className="font-mono font-semibold text-foreground">{requestId}</span>
        </div>
        <div className="flex items-center justify-between pt-2.5">
          <span className="text-muted-foreground">Statut du dossier</span>
          <span className="font-semibold text-accent">
            En attente d’évaluation (Dossier déposé)
          </span>
        </div>
      </div>
      <div className="flex flex-col-reverse justify-center gap-3 pt-2 sm:flex-row sm:items-center">
        <Button variant="outline" onClick={onGoToWallet}>
          Retour au tableau de bord
        </Button>
        <Button variant="accent" onClick={onGoToLoans} className="gap-2 font-semibold">
          Suivre ma demande <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

export function LoanProcessingResult({
  requestId,
  loanRequest,
  onGoToWallet,
  onGoToContract,
  onGoToLoans,
}: ResultProps) {
  if (!loanRequest) {
    return <ResultSyncingCard onGoToLoans={onGoToLoans} />;
  }

  const amount = loanRequest.approved_amount || loanRequest.amount;

  if (loanRequest.status === "ACCEPTED" || loanRequest.status === "PRE_APPROVED") {
    return (
      <ResultApprovalCard
        requestId={requestId}
        amount={amount}
        onGoToWallet={onGoToWallet}
        onGoToContract={onGoToContract}
      />
    );
  }

  if (loanRequest.status === "DISBURSED") {
    return (
      <ResultDisbursedCard
        requestId={requestId}
        amount={amount}
        onGoToWallet={onGoToWallet}
        onGoToLoans={onGoToLoans}
      />
    );
  }

  if (loanRequest.status === "REJECTED") {
    return <ResultRejectedCard onGoToWallet={onGoToWallet} />;
  }

  return (
    <ResultManualCard
      requestId={requestId}
      amount={amount}
      onGoToWallet={onGoToWallet}
      onGoToLoans={onGoToLoans}
    />
  );
}

"use client";

import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AiDecisionReport } from "@/lib/kyc-ai";

export type KycModalState = "idle" | "verifying" | "success" | "rejected";

export type KycVerificationModalProps = {
  open: boolean;
  state: KycModalState;
  reason: string | null;
  report?: AiDecisionReport | null;
  onClose: () => void;
  onModifyDocuments?: () => void;
  onRetry?: () => void;
  onGoToDashboard: () => void;
};

function VerifyingView() {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="relative mb-5 grid size-20 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
        <span className="absolute inset-1 animate-pulse rounded-full bg-accent/15" />
        <div className="relative grid size-16 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/25">
          <ShieldCheck className="size-8 text-accent-foreground" />
        </div>
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
        <Loader2 className="size-3.5 animate-spin" /> Analyse IA en cours
      </span>

      <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Vérification automatique
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Notre intelligence artificielle contrôle vos justificatifs et compare votre selfie avec
        votre pièce d’identité.
      </p>

      <div className="mt-6 flex w-full flex-col gap-2 rounded-2xl border border-border bg-muted/30 p-3.5 text-left text-xs sm:p-4">
        <div className="flex items-center gap-2.5 text-foreground">
          <FileText className="size-4 text-accent" />
          <span>Authenticité et lisibilité de la pièce</span>
        </div>
        <div className="flex items-center gap-2.5 text-foreground">
          <UserCheck className="size-4 text-accent" />
          <span>Comparaison biométrique faciale (Face Match)</span>
        </div>
        <div className="flex items-center gap-2.5 text-foreground">
          <ShieldCheck className="size-4 text-accent" />
          <span>Extraction sécurisée des informations officielles</span>
        </div>
      </div>
    </div>
  );
}

function SuccessView({
  report,
  onGoToDashboard,
}: {
  report?: AiDecisionReport | null;
  onGoToDashboard: () => void;
}) {
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (countdown <= 0) {
      onGoToDashboard();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onGoToDashboard]);

  const extracted = report?.extracted_data;

  return (
    <div className="flex flex-col items-center py-2 text-center">
      <div className="relative mb-4 grid size-20 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20 [animation-duration:3s]" />
        <div className="relative grid size-16 place-items-center rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/25">
          <CheckCircle2 className="size-9" strokeWidth={2.2} />
        </div>
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        100% Conforme • Validé
      </span>

      <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Identité validée avec succès !
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Votre dossier a été certifié par notre système automatisé. Votre compte est débloqué et vos
        opérations financières sont immédiatement actives.
      </p>

      {extracted?.name || extracted?.id_number ? (
        <div className="mt-5 grid w-full grid-cols-2 gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-left text-xs sm:p-4">
          {extracted.name ? (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Nom détecté</p>
              <p className="mt-0.5 font-bold text-foreground">{extracted.name}</p>
            </div>
          ) : null}
          {extracted.id_number ? (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">N° officiel</p>
              <p className="mt-0.5 font-bold text-foreground">{extracted.id_number}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 w-full space-y-3">
        <Button
          type="button"
          variant="accent"
          size="lg"
          onClick={onGoToDashboard}
          className="h-12 w-full bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
        >
          Accéder à mon tableau de bord <ArrowRight className="size-4" />
        </Button>
        <p className="text-xs text-muted-foreground">
          Redirection automatique dans{" "}
          <span className="font-bold text-foreground">{countdown}s</span>…
        </p>
      </div>
    </div>
  );
}

function DiagnosticChecks({ checks }: { checks?: AiDecisionReport["checks"] }) {
  if (!checks) return null;
  const items = [
    { label: "Document lisible et authentique", passed: checks.document_authentic },
    { label: "Correspondance faciale (Selfie / Pièce)", passed: checks.face_match },
    { label: "Document en cours de validité", passed: checks.not_expired },
  ];
  return (
    <div className="mt-4 flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-left text-xs">
      <p className="font-semibold text-muted-foreground">Diagnostic détaillé :</p>
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-2 py-0.5">
          <span className="text-muted-foreground">{item.label}</span>
          <span
            className={cn(
              "text-[11px] font-bold",
              item.passed === true
                ? "text-emerald-600 dark:text-emerald-400"
                : item.passed === false
                  ? "text-warning"
                  : "text-muted-foreground",
            )}
          >
            {item.passed === true ? "Validé" : item.passed === false ? "À corriger" : "Non testé"}
          </span>
        </div>
      ))}
    </div>
  );
}

function RejectedView({
  reason,
  report,
  onModifyDocuments,
  onRetry,
  onClose,
}: {
  reason: string | null;
  report?: AiDecisionReport | null;
  onModifyDocuments?: () => void;
  onRetry?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-2 text-center">
      <div className="relative mb-4 grid size-20 place-items-center">
        <span className="absolute inset-0 rounded-full bg-warning/20" />
        <div className="relative grid size-16 place-items-center rounded-2xl bg-warning/15 text-warning">
          <ShieldAlert className="size-8" />
        </div>
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-warning">
        Action requise
      </span>

      <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Vérification non validée
      </h3>

      <div className="mt-4 w-full rounded-2xl border border-warning/25 bg-warning/5 p-4 text-left">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="text-xs font-bold text-foreground">Motif du rejet automatique :</p>
            <p className="mt-1 text-xs leading-5 text-foreground/90">
              {reason ||
                "La vérification automatique par IA n'a pas pu valider votre dossier avec certitude."}
            </p>
          </div>
        </div>
      </div>

      <DiagnosticChecks checks={report?.checks} />

      <div className="mt-5 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-end">
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry} className="w-full sm:w-auto">
            <RefreshCw className="size-4" /> Réessayer
          </Button>
        ) : null}
        {onModifyDocuments ? (
          <Button
            type="button"
            variant="accent"
            onClick={onModifyDocuments}
            className="w-full font-bold sm:w-auto"
          >
            <Camera className="size-4" /> Modifier mes justificatifs
          </Button>
        ) : (
          <Button type="button" variant="accent" onClick={onClose} className="w-full sm:w-auto">
            Fermer
          </Button>
        )}
      </div>
    </div>
  );
}

export function KycVerificationModal({
  open,
  state,
  reason,
  report,
  onClose,
  onModifyDocuments,
  onRetry,
  onGoToDashboard,
}: KycVerificationModalProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state !== "verifying") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, state]);

  if (!open || state === "idle") return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kyc-modal-title"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm duration-200 animate-in fade-in sm:items-center sm:p-4"
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-border bg-card p-6 text-foreground shadow-2xl duration-200 animate-in slide-in-from-bottom-6 sm:max-h-[88dvh] sm:rounded-[24px] sm:p-8 sm:zoom-in-95 sm:slide-in-from-bottom-0">
        {state !== "verifying" ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fermer la fenêtre"
          >
            <X className="size-4" />
          </button>
        ) : null}

        <div className="overflow-y-auto pr-1">
          {state === "verifying" ? <VerifyingView /> : null}
          {state === "success" ? (
            <SuccessView report={report} onGoToDashboard={onGoToDashboard} />
          ) : null}
          {state === "rejected" ? (
            <RejectedView
              reason={reason}
              report={report}
              onModifyDocuments={onModifyDocuments}
              onRetry={onRetry}
              onClose={onClose}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}

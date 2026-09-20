import { BadgeCheck, CheckCircle2, Clock, Loader2, ShieldCheck, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const STAGES = [
  {
    icon: Clock,
    title: "Réception de la demande & Vérification des pièces",
    description: "Contrôle d’éligibilité et validation de conformité des informations du dossier…",
    minPercent: 0,
    maxPercent: 28,
  },
  {
    icon: TrendingUp,
    title: "Analyse financière automatisée",
    description: "Évaluation de la solvabilité et calcul de la capacité d’emprunt…",
    minPercent: 28,
    maxPercent: 60,
  },
  {
    icon: ShieldCheck,
    title: "Contrôle prudentiel & Conformité réglementaire",
    description: "Vérification des ratios UEMOA et validation des plafonds légaux…",
    minPercent: 60,
    maxPercent: 90,
  },
  {
    icon: BadgeCheck,
    title: "Finalisation de la décision d’octroi",
    description: "Validation finale du financement et mise à disposition des fonds…",
    minPercent: 90,
    maxPercent: 100,
  },
];

function AnalysisHeader({ requestId }: { requestId: string }) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          <span>Traitement en cours</span>
        </div>
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Demande envoyée, en cours d’analyse…
        </h2>
        <p className="text-sm text-muted-foreground">
          Votre demande de prêt a bien été transmise. Notre système étudie actuellement votre
          dossier.
        </p>
      </div>

      <div className="shrink-0 text-right">
        <span className="font-mono text-xs text-muted-foreground">
          Réf: {requestId.slice(0, 8)}
        </span>
      </div>
    </div>
  );
}

function StagesList({ progress }: { progress: number }) {
  return (
    <div className="space-y-2.5">
      {STAGES.map((stage) => {
        const isDone = progress >= stage.maxPercent;
        const isActive = progress >= stage.minPercent && progress < stage.maxPercent;
        const Icon = stage.icon;

        return (
          <div
            key={stage.title}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-300",
              isDone
                ? "border-accent/30 bg-accent/5 text-foreground"
                : isActive
                  ? "shadow-xs border-accent/40 bg-accent/10"
                  : "border-border/60 bg-muted/20 opacity-55",
            )}
          >
            <div
              className={cn(
                "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                isDone
                  ? "bg-accent text-white"
                  : isActive
                    ? "bg-accent/20 text-accent"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {isDone ? (
                <CheckCircle2 className="size-4" strokeWidth={2.4} aria-hidden />
              ) : isActive ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Icon className="size-4" aria-hidden />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{stage.title}</p>
                <span className="font-mono text-[11px] font-medium text-muted-foreground">
                  {isDone ? "Validé" : isActive ? "En cours" : "En attente"}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                {stage.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LoanProcessingAnalysis({
  requestId,
  progress,
}: {
  requestId: string;
  secondsLeft?: number;
  progress: number;
}) {
  return (
    <Card role="status" aria-live="polite" className="space-y-6 p-6 sm:p-8">
      <AnalysisHeader requestId={requestId} />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">Progression de l’évaluation</span>
          <span className="font-mono font-bold text-accent">{progress} %</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <StagesList progress={progress} />
    </Card>
  );
}

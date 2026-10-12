import { AlertTriangle, HardDrive, RefreshCw } from "lucide-react";

import { formatBytes, type StorageUsage } from "@/lib/admin/storage-utils";
import { cn } from "@/lib/utils";

interface GaugeSectionProps {
  usage: StorageUsage;
  totalFiles: number;
  isLoading: boolean;
  onRefresh: () => void;
}

interface StorageMetricsGridProps {
  usage: StorageUsage;
  totalFiles: number;
  levelColor: string;
}

function StorageMetricsGrid({ usage, totalFiles, levelColor }: StorageMetricsGridProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
        <p className="text-xs font-semibold text-muted-foreground">Espace utilisé</p>
        <p className="mt-1 font-display text-2xl font-bold text-foreground">
          {formatBytes(usage.usedBytes)}
        </p>
        <p className="text-xs text-muted-foreground">
          sur {formatBytes(usage.quotaBytes)} ({usage.usedPercentage}%)
        </p>
      </div>
      <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
        <p className="text-xs font-semibold text-muted-foreground">Espace restant</p>
        <p className={cn("mt-1 font-display text-2xl font-bold", levelColor)}>
          {formatBytes(usage.remainingBytes)}
        </p>
        <p className="text-xs text-muted-foreground">
          {(100 - usage.usedPercentage).toFixed(1)}% de marge disponible
        </p>
      </div>
      <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
        <p className="text-xs font-semibold text-muted-foreground">Fichiers en ligne</p>
        <p className="mt-1 font-display text-2xl font-bold text-foreground">{totalFiles}</p>
        <p className="text-xs text-muted-foreground">pièces jointes stockées</p>
      </div>
    </div>
  );
}

interface StorageProgressSectionProps {
  usage: StorageUsage;
  levelColor: string;
  barColor: string;
}

function StorageProgressSection({ usage, levelColor, barColor }: StorageProgressSectionProps) {
  return (
    <div className="mt-6 space-y-2">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">Taux d&apos;occupation</span>
        <span className={cn("font-bold", levelColor)}>{usage.usedPercentage}%</span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={usage.usedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Taux d'occupation du stockage"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${Math.min(100, Math.max(0, usage.usedPercentage))}%` }}
        />
      </div>
      {usage.level === "critical" && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          Alerte critique : stockage presque saturé (&gt; 90%). Une purge est fortement recommandée.
        </p>
      )}
      {usage.level === "warning" && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          Attention : vous approchez de la limite des 1 Go (&gt; 70%).
        </p>
      )}
    </div>
  );
}

function getStorageColors(level: StorageUsage["level"]) {
  if (level === "normal") {
    return { levelColor: "text-emerald-600", barColor: "bg-emerald-500" };
  }
  if (level === "warning") {
    return { levelColor: "text-amber-600", barColor: "bg-amber-500" };
  }
  return { levelColor: "text-rose-600", barColor: "bg-rose-500" };
}

export function StorageGaugeSection({
  usage,
  totalFiles,
  isLoading,
  onRefresh,
}: GaugeSectionProps) {
  const { levelColor, barColor } = getStorageColors(usage.level);

  return (
    <section
      aria-labelledby="storage-gauge-title"
      className="rounded-2xl border border-border bg-card p-6 shadow-card"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-primary/10 text-primary">
            <HardDrive className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="storage-gauge-title" className="font-display text-lg font-bold text-foreground">
              Espace de stockage Supabase (Quota 1 Go)
            </h2>
            <p className="text-xs text-muted-foreground">
              Surveillance en temps réel de votre espace en ligne.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          aria-label="Actualiser les données de stockage"
        >
          <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} aria-hidden="true" />
          Actualiser
        </button>
      </div>

      <StorageMetricsGrid usage={usage} totalFiles={totalFiles} levelColor={levelColor} />
      <StorageProgressSection usage={usage} levelColor={levelColor} barColor={barColor} />
    </section>
  );
}

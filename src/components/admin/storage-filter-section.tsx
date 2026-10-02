import { AlertTriangle, Calendar, CheckCircle2, Loader2, Trash2 } from "lucide-react";

import { formatBytes } from "@/lib/admin/storage-utils";

interface DateInputsProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
}

function DateInputs({ startDate, endDate, onStartDateChange, onEndDateChange }: DateInputsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label
          htmlFor="storage-start-date"
          className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          Date de début
        </label>
        <input
          id="storage-start-date"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="mt-2 block w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label
          htmlFor="storage-end-date"
          className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          Date de fin
        </label>
        <input
          id="storage-end-date"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="mt-2 block w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );
}

function EstimateBanner({
  isEstimating,
  estimate,
}: {
  isEstimating: boolean;
  estimate: { count: number; bytes: number } | null;
}) {
  if (!estimate) return null;
  return (
    <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-4">
      {isEstimating ? (
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Calcul des fichiers sur cette période…
        </p>
      ) : (
        <p className="text-sm font-semibold text-foreground">
          {estimate.count > 0 ? (
            <>
              <span className="font-bold text-primary">{estimate.count} fichier(s)</span> trouvé(s)
              sur cette période, soit{" "}
              <span className="font-bold text-primary">{formatBytes(estimate.bytes)}</span> à
              libérer.
            </>
          ) : (
            <span className="text-muted-foreground">Aucun fichier trouvé sur cette période.</span>
          )}
        </p>
      )}
    </div>
  );
}

interface FilterSectionProps {
  startDate: string;
  endDate: string;
  dateError?: string;
  isEstimating: boolean;
  estimate: { count: number; bytes: number } | null;
  purgeFeedback: string | null;
  error: string | null;
  canPurge: boolean;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onRequestPurge: () => void;
}

export function StorageDateFilterSection({
  startDate,
  endDate,
  dateError,
  isEstimating,
  estimate,
  purgeFeedback,
  error,
  canPurge,
  onStartDateChange,
  onEndDateChange,
  onRequestPurge,
}: FilterSectionProps) {
  return (
    <section
      aria-labelledby="purge-section-title"
      className="rounded-2xl border border-border bg-card p-6 shadow-card"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-muted text-foreground">
          <Calendar className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="purge-section-title" className="font-display text-lg font-bold text-foreground">
            Nettoyage par plage de dates
          </h2>
          <p className="text-xs text-muted-foreground">
            Supprimez les fichiers de la période choisie. Vos sauvegardes locales restent intactes.
          </p>
        </div>
      </div>

      <DateInputs
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />

      {dateError && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          {dateError}
        </p>
      )}

      <EstimateBanner isEstimating={isEstimating} estimate={estimate} />

      {purgeFeedback && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>{purgeFeedback}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm font-medium text-rose-700"
        >
          <AlertTriangle className="size-4 shrink-0 text-rose-600" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end">
        <button
          type="button"
          onClick={onRequestPurge}
          disabled={!canPurge}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-700 active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Supprimer les fichiers de cette période
        </button>
      </div>
    </section>
  );
}

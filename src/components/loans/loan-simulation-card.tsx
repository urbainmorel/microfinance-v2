import { ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatFcfa } from "@/lib/format";

import type { LoanSimulation, ScheduleRow } from "@/components/loans/loan-request-types";

function ScheduleLine({ row }: { row: ScheduleRow }) {
  return (
    <tr className="border-t border-border">
      <td className="py-3 pr-3 font-medium text-foreground">{row.installmentNo}</td>
      <td className="py-3 pr-3 text-muted-foreground">
        {new Intl.DateTimeFormat("fr-FR").format(new Date(row.dueDate))}
      </td>
      <td className="py-3 pr-3 text-muted-foreground">{formatFcfa(row.principal)}</td>
      <td className="py-3 text-right font-semibold text-foreground">{formatFcfa(row.total)}</td>
    </tr>
  );
}

function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  if (!rows.length) return null;
  return (
    <details open className="mt-5 border-t border-border pt-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
        Voir l’échéancier ({rows.length} échéances)
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </summary>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card px-3">
        <table className="w-full min-w-[430px] text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">N°</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Capital</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ScheduleLine key={row.installmentNo} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function LoanSimulationCard({ simulation }: { simulation: LoanSimulation }) {
  const monthlyAmount = simulation.schedule[0]?.total ?? simulation.totalDue;
  const summary = [
    ["Frais totaux", simulation.totalFees],
    ["Intérêts totaux", simulation.totalInterest],
    ["Garantie requise", simulation.guaranteeRequired],
    ["Épargne obligatoire", simulation.mandatorySavingsTotal],
    ["Montant récupérable", simulation.recoverableAmount],
  ] as const;
  return (
    <Card className="border-border bg-card p-5 shadow-none sm:p-6" aria-live="polite">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Étape 3</p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
            Votre simulation
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultez le coût complet avant de poursuivre votre demande.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 sm:text-right">
            <p className="text-xs font-semibold text-muted-foreground">Total à rembourser</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
              {formatFcfa(simulation.totalDue)}
            </p>
          </div>
          <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 sm:text-right">
            <p className="text-xs font-semibold text-muted-foreground">À rembourser par mois :</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
              {formatFcfa(monthlyAmount)}
            </p>
          </div>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        {summary.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-bold text-foreground">{formatFcfa(value)}</dd>
          </div>
        ))}
      </dl>
      <ScheduleTable rows={simulation.schedule} />
    </Card>
  );
}

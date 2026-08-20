import { ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatFcfa } from "@/lib/format";

import type { LoanSimulation, ScheduleRow } from "@/components/loans/loan-request-types";

function ScheduleLine({ row }: { row: ScheduleRow }) {
  return (
    <tr className="border-t border-border/70">
      <td className="py-2 pr-3">{row.installmentNo}</td>
      <td className="py-2 pr-3">
        {new Intl.DateTimeFormat("fr-FR").format(new Date(row.dueDate))}
      </td>
      <td className="py-2 pr-3">{formatFcfa(row.principal)}</td>
      <td className="py-2 text-right font-semibold">{formatFcfa(row.total)}</td>
    </tr>
  );
}

function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  if (!rows.length) return null;
  return (
    <details className="mt-4 border-t border-border pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
        Voir l’échéancier ({rows.length} échéances)
        <ChevronDown aria-hidden />
      </summary>
      <div className="mt-3 overflow-x-auto">
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
  const summary = [
    ["Frais totaux", simulation.totalFees],
    ["Intérêts totaux", simulation.totalInterest],
    ["Garantie requise", simulation.guaranteeRequired],
    ["Épargne obligatoire", simulation.mandatorySavingsTotal],
    ["Montant récupérable", simulation.recoverableAmount],
    ["Total à rembourser", simulation.totalDue],
  ] as const;
  return (
    <Card className="border-accent/30 bg-pastel-green/40" aria-live="polite">
      <h2 className="font-display text-lg font-bold text-foreground">Résultat de la simulation</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {summary.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-bold text-foreground">{formatFcfa(value)}</dd>
          </div>
        ))}
      </dl>
      <ScheduleTable rows={simulation.schedule} />
    </Card>
  );
}

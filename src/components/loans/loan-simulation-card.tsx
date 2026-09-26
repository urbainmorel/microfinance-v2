import { ChevronDown, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatFcfa } from "@/lib/format";

import type { LoanSimulation, ScheduleRow } from "@/components/loans/loan-request-types";

function getMonthlyCreditPayment(simulation: LoanSimulation): number {
  if (simulation.monthlyPayment !== undefined) {
    return simulation.monthlyPayment;
  }
  const firstRow = simulation.schedule[0];
  if (!firstRow) {
    return simulation.totalDue;
  }
  if (firstRow.loanInstallment !== undefined) {
    return firstRow.loanInstallment;
  }
  return firstRow.principal + firstRow.interest + (firstRow.fees ?? 0);
}

function getTotalLoanRepaid(simulation: LoanSimulation): number {
  if (simulation.loanTotalRepaid !== undefined) {
    return simulation.loanTotalRepaid;
  }
  if (simulation.amount !== undefined) {
    return simulation.amount + simulation.totalInterest + simulation.totalFees;
  }
  const hasSavings = (simulation.mandatorySavingsTotal ?? 0) > 0;
  if (simulation.schedule.length > 0 && hasSavings) {
    return simulation.schedule.reduce(
      (sum, row) => sum + (row.loanInstallment ?? row.principal + row.interest + (row.fees ?? 0)),
      0,
    );
  }
  return simulation.totalDue;
}

function getRecoverableAmount(simulation: LoanSimulation): number {
  if (simulation.recoverableAmount !== undefined) {
    return simulation.recoverableAmount;
  }
  return (simulation.guaranteeRequired ?? 0) + (simulation.mandatorySavingsTotal ?? 0);
}

function computeSimulationMetrics(simulation: LoanSimulation) {
  const firstRow = simulation.schedule[0];
  const monthlyCreditPayment = getMonthlyCreditPayment(simulation);
  const monthlySavings = firstRow?.mandatorySavings ?? 0;
  const hasSavings = (simulation.mandatorySavingsTotal ?? 0) > 0 || monthlySavings > 0;
  const monthlyTotalDebited =
    simulation.monthlyTotal ?? (firstRow ? firstRow.total : monthlyCreditPayment);

  return {
    monthlyCreditPayment,
    monthlySavings,
    hasSavings,
    monthlyTotalDebited,
    totalLoanRepaid: getTotalLoanRepaid(simulation),
    recoverableAmount: getRecoverableAmount(simulation),
  };
}

function ScheduleLine({ row, hasSavings }: { row: ScheduleRow; hasSavings: boolean }) {
  const creditPayment = row.loanInstallment ?? row.principal + row.interest + (row.fees ?? 0);
  return (
    <tr className="border-t border-border">
      <td className="py-3 pr-3 font-medium text-foreground">{row.installmentNo}</td>
      <td className="py-3 pr-3 text-muted-foreground">
        {new Intl.DateTimeFormat("fr-FR").format(new Date(row.dueDate))}
      </td>
      <td className="py-3 pr-3 text-muted-foreground">{formatFcfa(row.principal)}</td>
      <td className="py-3 pr-3 text-muted-foreground">{formatFcfa(row.interest)}</td>
      {hasSavings ? (
        <td className="py-3 pr-3 text-muted-foreground">{formatFcfa(row.mandatorySavings)}</td>
      ) : null}
      <td className="py-3 text-right font-semibold text-foreground">{formatFcfa(creditPayment)}</td>
      {hasSavings ? (
        <td className="py-3 text-right font-semibold text-accent">{formatFcfa(row.total)}</td>
      ) : null}
    </tr>
  );
}

function ScheduleTable({ rows, hasSavings }: { rows: ScheduleRow[]; hasSavings: boolean }) {
  if (!rows.length) return null;
  return (
    <details open className="mt-5 border-t border-border pt-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
        Voir l’échéancier ({rows.length} échéances)
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </summary>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card px-3">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">N°</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Capital</th>
              <th className="py-2 pr-3">Intérêts</th>
              {hasSavings ? <th className="py-2 pr-3">Épargne</th> : null}
              <th className="py-2 text-right">Mensualité prêt</th>
              {hasSavings ? <th className="py-2 text-right">Total prélevé</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ScheduleLine key={row.installmentNo} row={row} hasSavings={hasSavings} />
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function SimulationHeader({
  totalLoanRepaid,
  totalDue,
  monthlyCreditPayment,
  monthlySavings,
  monthlyTotalDebited,
  hasSavings,
}: {
  totalLoanRepaid: number;
  totalDue: number;
  monthlyCreditPayment: number;
  monthlySavings: number;
  monthlyTotalDebited: number;
  hasSavings: boolean;
}) {
  return (
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
            {formatFcfa(totalLoanRepaid)}
          </p>
          {hasSavings ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Soit {formatFcfa(totalDue)} prélevé avec l’épargne
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 sm:text-right">
          <p className="text-xs font-semibold text-muted-foreground">À rembourser par mois :</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {formatFcfa(monthlyCreditPayment)}
          </p>
          {hasSavings ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              + {formatFcfa(monthlySavings)} / mois d’épargne (total :{" "}
              {formatFcfa(monthlyTotalDebited)})
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RecoverableBanner({
  recoverableAmount,
  guaranteeRequired,
  mandatorySavingsTotal,
}: {
  recoverableAmount: number;
  guaranteeRequired: number;
  mandatorySavingsTotal: number;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
          <div>
            <p className="text-sm font-bold text-foreground">
              Total montant récupérable : {formatFcfa(recoverableAmount)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Garantie ({formatFcfa(guaranteeRequired)}) et épargne obligatoire (
              {formatFcfa(mandatorySavingsTotal)}) restituées au terme du remboursement (non inclus
              dans les coûts du prêt).
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
          Restituable à 100%
        </span>
      </div>
    </div>
  );
}

export function LoanSimulationCard({ simulation }: { simulation: LoanSimulation }) {
  const metrics = computeSimulationMetrics(simulation);

  const summary = [
    ["Frais totaux", simulation.totalFees],
    ["Intérêts totaux", simulation.totalInterest],
    ["Garantie requise", simulation.guaranteeRequired],
    ["Épargne obligatoire", simulation.mandatorySavingsTotal],
    ["Montant récupérable", metrics.recoverableAmount],
  ] as const;

  return (
    <Card className="border-border bg-card p-5 shadow-none sm:p-6" aria-live="polite">
      <SimulationHeader
        totalLoanRepaid={metrics.totalLoanRepaid}
        totalDue={simulation.totalDue}
        monthlyCreditPayment={metrics.monthlyCreditPayment}
        monthlySavings={metrics.monthlySavings}
        monthlyTotalDebited={metrics.monthlyTotalDebited}
        hasSavings={metrics.hasSavings}
      />

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
        {summary.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-bold text-foreground">{formatFcfa(value)}</dd>
          </div>
        ))}
      </dl>

      <RecoverableBanner
        recoverableAmount={metrics.recoverableAmount}
        guaranteeRequired={simulation.guaranteeRequired}
        mandatorySavingsTotal={simulation.mandatorySavingsTotal}
      />

      <ScheduleTable rows={simulation.schedule} hasSavings={metrics.hasSavings} />
    </Card>
  );
}

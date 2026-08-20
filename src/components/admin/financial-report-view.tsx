"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reportToCsv } from "@/lib/admin/financial-report";
import { formatCurrency } from "@/lib/admin/format";

import type { FinancialReport } from "@/lib/admin/financial-report";

function download(report: FinancialReport) {
  const url = URL.createObjectURL(
    new Blob([reportToCsv(report)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rapport-microfinance-${report.from}-${report.to}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function FinancialReportView({ report }: { report: FinancialReport }) {
  const metrics = [
    ["Dépôts confirmés", formatCurrency(report.summary.confirmedDeposits)],
    ["Retraits exécutés", formatCurrency(report.summary.completedWithdrawals)],
    ["Remboursements", formatCurrency(report.summary.confirmedRepayments)],
    ["Prêts décaissés", formatCurrency(report.summary.disbursedLoans)],
    ["Capital restant", formatCurrency(report.summary.outstandingPrincipal)],
    ["Prêts actifs / défaut", `${report.summary.activeLoans} / ${report.summary.defaultedLoans}`],
  ];
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => download(report)}>
          <Download className="size-4" aria-hidden /> Exporter en CSV
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">
            Flux financiers par pays du {report.from} au {report.to}
          </caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="p-3">
                Pays
              </th>
              <th scope="col" className="p-3">
                Clients
              </th>
              <th scope="col" className="p-3">
                Dépôts
              </th>
              <th scope="col" className="p-3">
                Retraits
              </th>
            </tr>
          </thead>
          <tbody>
            {report.countries.map((row) => (
              <tr key={row.country} className="border-t border-border">
                <th scope="row" className="p-3 font-semibold">
                  {row.country}
                </th>
                <td className="p-3">{row.clients}</td>
                <td className="p-3">{formatCurrency(row.deposits)}</td>
                <td className="p-3">{formatCurrency(row.withdrawals)}</td>
              </tr>
            ))}
            {report.countries.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Aucune donnée sur cette période.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

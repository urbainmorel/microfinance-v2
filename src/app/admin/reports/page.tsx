"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AdminError, AdminLoading, AdminPageHeader } from "@/components/admin/admin-page";
import { FinancialReportView } from "@/components/admin/financial-report-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFinancialReport } from "@/lib/admin/api-reports";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
const today = isoDate(new Date());
const monthAgo = isoDate(new Date(Date.now() - 30 * 86400000));

export default function AdminReportsPage() {
  const [period, setPeriod] = useState({ from: monthAgo, to: today });
  const [applied, setApplied] = useState(period);
  const query = useQuery({
    queryKey: ["admin", "report", applied],
    queryFn: () => getFinancialReport(applied.from, applied.to),
  });
  return (
    <>
      <AdminPageHeader
        eyebrow="Pilotage"
        title="Rapports financiers"
        description="Analysez les flux confirmés et exportez une synthèse contrôlable."
      />
      <form
        className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(period);
        }}
      >
        <label className="space-y-1">
          <span className="block text-xs font-bold">Du</span>
          <Input
            type="date"
            value={period.from}
            max={period.to}
            onChange={(event) => setPeriod((value) => ({ ...value, from: event.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-bold">Au</span>
          <Input
            type="date"
            value={period.to}
            min={period.from}
            max={today}
            onChange={(event) => setPeriod((value) => ({ ...value, to: event.target.value }))}
          />
        </label>
        <Button>Actualiser</Button>
      </form>
      {query.isPending ? <AdminLoading /> : null}
      {query.isError ? <AdminError message={query.error.message} /> : null}
      {query.data ? <FinancialReportView report={query.data} /> : null}
    </>
  );
}

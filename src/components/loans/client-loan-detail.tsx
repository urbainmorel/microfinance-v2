"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { RepaymentRequestForm } from "@/components/operations/repayment-request-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { cn } from "@/lib/utils";

type Schedule = {
  due_date: string;
  due_fees: number | null;
  due_interest: number;
  due_mandatory_savings: number | null;
  due_principal: number;
  installment_no: number;
  paid_fees: number | null;
  paid_interest: number | null;
  paid_mandatory_savings: number | null;
  paid_penalty: number;
  paid_principal: number | null;
  penalty_accrued: number | null;
  status: string | null;
};
type Loan = {
  end_date: string;
  id: string;
  interest_rate: number;
  remaining_principal: number;
  start_date: string;
  status: string | null;
  total_amount: number;
};

function remaining(row: Schedule) {
  return (
    Math.max(row.due_principal - (row.paid_principal ?? 0), 0) +
    Math.max(row.due_interest - (row.paid_interest ?? 0), 0) +
    Math.max((row.due_fees ?? 0) - (row.paid_fees ?? 0), 0) +
    Math.max((row.due_mandatory_savings ?? 0) - (row.paid_mandatory_savings ?? 0), 0) +
    Math.max((row.penalty_accrued ?? 0) - row.paid_penalty, 0)
  );
}

function useLoanDetail(id: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["client-loan", id],
    queryFn: async () => {
      const [loanResult, scheduleResult] = await Promise.all([
        supabase
          .from("loans")
          .select("id,total_amount,remaining_principal,interest_rate,start_date,end_date,status")
          .eq("id", id)
          .single(),
        supabase
          .from("amortization_schedules")
          .select(
            "installment_no,due_date,due_principal,due_interest,due_fees,due_mandatory_savings,penalty_accrued,paid_principal,paid_interest,paid_fees,paid_mandatory_savings,paid_penalty,status",
          )
          .eq("loan_id", id)
          .order("installment_no"),
      ]);
      if (loanResult.error) throw loanResult.error;
      if (scheduleResult.error) throw scheduleResult.error;
      return { loan: loanResult.data as Loan, schedule: (scheduleResult.data ?? []) as Schedule[] };
    },
  });
}

function Summary({
  loan,
  schedule,
  onRepay,
}: {
  loan: Loan;
  schedule: Schedule[];
  onRepay: () => void;
}) {
  const outstanding = schedule.reduce((sum, row) => sum + remaining(row), 0);
  const next = schedule.find((row) => remaining(row) > 0);
  return (
    <Card className="space-y-5 p-6 sm:p-7">
      <div>
        <p className="text-sm text-muted-foreground">Solde total à régulariser</p>
        <p className="mt-1 font-display text-3xl font-bold tracking-[-0.035em] [font-variant-numeric:tabular-nums]">
          {formatFcfa(outstanding)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Capital restant</p>
          <p className="font-semibold">{formatFcfa(loan.remaining_principal)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Taux annuel</p>
          <p className="font-semibold">{loan.interest_rate} %</p>
        </div>
      </div>
      {next ? (
        <p className="rounded-xl bg-muted p-3 text-sm">
          <strong>Prochaine échéance :</strong> {formatFcfa(remaining(next))} avant le{" "}
          {new Intl.DateTimeFormat("fr-FR").format(new Date(next.due_date))}.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Le remboursement anticipé est autorisé sans frais supplémentaires. Le montant exact reste
        soumis à la confirmation manuelle d’un agent.
      </p>
      {loan.status !== "CLOSED" ? (
        <Button variant="accent" className="w-full" onClick={onRepay}>
          Effectuer un remboursement
        </Button>
      ) : null}
    </Card>
  );
}

function ScheduleList({ rows }: { rows: Schedule[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="divide-y divide-separator">
        {rows.map((row) => (
          <div
            key={row.installment_no}
            className="flex items-center justify-between gap-4 px-5 py-4"
          >
            <div>
              <p className="font-semibold">Échéance {row.installment_no}</p>
              <p className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("fr-FR").format(new Date(row.due_date))} · {row.status}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold [font-variant-numeric:tabular-nums]">
                {formatFcfa(remaining(row))}
              </p>
              <p className="text-xs text-muted-foreground">
                Capital {formatFcfa(Math.max(row.due_principal - (row.paid_principal ?? 0), 0))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ClientLoanDetail({ id }: { id: string }) {
  const query = useLoanDetail(id);
  const [repayOpen, setRepayOpen] = useState(false);
  if (query.isPending) return <Skeleton className="h-80 w-full rounded-2xl" />;
  if (query.isError || !query.data)
    return (
      <EmptyState
        icon={CalendarClock}
        title="Prêt introuvable"
        hint="Ce prêt n’est pas accessible."
      />
    );
  return (
    <div className="space-y-6">
      <Link
        href="/client/loans"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-0")}
      >
        <ArrowLeft aria-hidden /> Mon prêt
      </Link>
      <PageHeader title="Détail du prêt" description="Échéancier et solde en temps réel." />
      <Summary
        loan={query.data.loan}
        schedule={query.data.schedule}
        onRepay={() => setRepayOpen(true)}
      />
      <section>
        <h2 className="mb-4 font-display text-xl font-bold tracking-[-0.025em]">Échéancier</h2>
        <ScheduleList rows={query.data.schedule} />
      </section>
      <Modal
        open={repayOpen}
        onOpenChange={setRepayOpen}
        title="Rembourser mon prêt"
        description="Ajoutez le paiement et son justificatif, puis confirmez la demande avec votre PIN."
      >
        <RepaymentRequestForm />
      </Modal>
    </div>
  );
}

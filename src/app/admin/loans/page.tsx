"use client";

import { useQuery } from "@tanstack/react-query";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { useAdminRole } from "@/components/admin/admin-role-context";
import { LoanQueueCard } from "@/components/admin/loan-queue-card";
import { disburseLoan, getLoanQueue, transitionLoanRequest } from "@/lib/admin/api";
import { adminKeys, useAdminMutation } from "@/lib/admin/hooks";

import type { StaffActionValues } from "@/components/admin/staff-actions";

interface LoanCommand extends StaffActionValues {
  id: string;
  action: string;
}

async function executeLoanCommand(command: LoanCommand) {
  if (command.action === "DISBURSE") {
    await disburseLoan(command.id, command.reference ?? "");
    return;
  }
  await transitionLoanRequest(command.id, command.action, command.amount, command.reason);
}

export default function AdminLoansPage() {
  const query = useQuery({ queryKey: adminKeys.loans, queryFn: getLoanQueue });
  const mutation = useAdminMutation(executeLoanCommand, [adminKeys.loans, adminKeys.kpis]);
  const { can } = useAdminRole();
  return (
    <>
      <AdminPageHeader
        eyebrow="Crédit"
        title="Demandes de prêt"
        description="Pilotez l’analyse, la validation et le décaissement sans contourner la machine d’états."
      />
      {query.isPending ? <AdminLoading /> : null}
      {query.isError ? <AdminError message={query.error.message} /> : null}
      {query.data?.length === 0 ? <AdminEmpty label="Aucune demande de prêt" /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {query.data?.map((item) => (
          <LoanQueueCard
            key={item.id}
            item={item}
            canMutate={can("loans")}
            busy={mutation.isPending}
            error={mutation.error}
            success={mutation.isSuccess}
            submit={(action, values) => mutation.mutate({ id: item.id, action, ...values })}
          />
        ))}
      </div>
    </>
  );
}

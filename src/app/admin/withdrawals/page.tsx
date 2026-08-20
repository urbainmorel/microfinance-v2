"use client";

import { useQuery } from "@tanstack/react-query";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  MutationFeedback,
} from "@/components/admin/admin-page";
import { useAdminRole } from "@/components/admin/admin-role-context";
import { QueueCard } from "@/components/admin/queue-card";
import { StaffActions } from "@/components/admin/staff-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { getWithdrawalQueue, settleWithdrawal } from "@/lib/admin/api";
import { clientName, formatCurrency, formatDate, formatStatus } from "@/lib/admin/format";
import { adminKeys, useAdminMutation } from "@/lib/admin/hooks";

export default function AdminWithdrawalsPage() {
  const query = useQuery({ queryKey: adminKeys.withdrawals, queryFn: getWithdrawalQueue });
  const mutation = useAdminMutation(
    ({
      id,
      action,
      reference,
      reason,
    }: {
      id: string;
      action: string;
      reference: string | null;
      reason: string | null;
    }) => settleWithdrawal(id, action, reference, reason),
    [adminKeys.withdrawals, adminKeys.kpis],
  );
  const { can } = useAdminRole();

  return (
    <>
      <AdminPageHeader
        eyebrow="Caisse"
        title="File des retraits"
        description="Exécutez les retraits entre 8 h et 19 h avec la référence remise par l’opérateur ou la banque."
      />
      {query.isPending ? <AdminLoading /> : null}
      {query.isError ? <AdminError message={query.error.message} /> : null}
      {query.data?.length === 0 ? <AdminEmpty label="Aucune demande de retrait" /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {query.data?.map((item) => (
          <QueueCard
            key={item.id}
            title={clientName(item.client)}
            subtitle={item.client?.phone ?? item.clientId}
            status={<StatusBadge status={item.status} />}
            facts={[
              { label: "Montant", value: formatCurrency(item.amount) },
              { label: "Canal", value: formatStatus(item.type) },
              { label: "Bénéficiaire", value: item.recipientName },
              { label: "Destination", value: item.recipientDetail || "Non renseignée" },
              { label: "Référence", value: item.externalReference ?? "En attente" },
              { label: "Créé le", value: formatDate(item.createdAt) },
            ]}
          >
            {can("cash") && item.status === "PENDING" ? (
              <StaffActions
                busy={mutation.isPending}
                actions={[
                  { value: "EXECUTE", label: "Exécuter", requiresReference: true, tone: "accent" },
                  { value: "REJECT", label: "Rejeter", requiresReason: true },
                ]}
                onSubmit={(action, values) =>
                  mutation.mutate({
                    id: item.id,
                    action,
                    reference: values.reference,
                    reason: values.reason,
                  })
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Consultation en lecture seule.</p>
            )}
            <MutationFeedback error={mutation.error} success={mutation.isSuccess} />
          </QueueCard>
        ))}
      </div>
    </>
  );
}

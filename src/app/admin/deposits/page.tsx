"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

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
import { confirmDeposit, getDepositQueue } from "@/lib/admin/api";
import { clientName, formatCurrency, formatDate, formatStatus } from "@/lib/admin/format";
import { adminKeys, useAdminMutation } from "@/lib/admin/hooks";

export default function AdminDepositsPage() {
  const query = useQuery({ queryKey: adminKeys.deposits, queryFn: getDepositQueue });
  const mutation = useAdminMutation(
    ({ id, action, reason }: { id: string; action: string; reason: string | null }) =>
      confirmDeposit(id, action, reason),
    [adminKeys.deposits, adminKeys.kpis],
  );
  const { can } = useAdminRole();

  return (
    <>
      <AdminPageHeader
        eyebrow="Caisse"
        title="File des dépôts"
        description="Confirmez uniquement les fonds effectivement reçus et rejetez avec un motif traçable."
      />
      {query.isPending ? <AdminLoading /> : null}
      {query.isError ? <AdminError message={query.error.message} /> : null}
      {query.data?.length === 0 ? <AdminEmpty label="Aucune demande de dépôt" /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {query.data?.map((item) => (
          <QueueCard
            key={item.id}
            title={clientName(item.client)}
            subtitle={item.client?.phone ?? item.clientId}
            status={<StatusBadge status={item.status} />}
            facts={[
              { label: "Montant", value: formatCurrency(item.amount) },
              { label: "Affectation", value: formatStatus(item.motif) },
              { label: "Paiement", value: formatStatus(item.paymentMethod) },
              { label: "Référence", value: item.reference ?? "Non renseignée" },
              { label: "Créé le", value: formatDate(item.createdAt) },
              {
                label: "Justificatif",
                value: item.proofUrl ? (
                  <a
                    href={item.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    Ouvrir <ExternalLink className="size-3" />
                  </a>
                ) : (
                  "Absent"
                ),
              },
            ]}
          >
            {can("cash") && item.status === "PENDING" ? (
              <StaffActions
                busy={mutation.isPending}
                actions={[
                  { value: "CONFIRM", label: "Confirmer", tone: "accent" },
                  { value: "REJECT", label: "Rejeter", requiresReason: true },
                ]}
                onSubmit={(action, values) =>
                  mutation.mutate({ id: item.id, action, reason: values.reason })
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

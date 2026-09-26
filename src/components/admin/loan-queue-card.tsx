import { MutationFeedback } from "@/components/admin/admin-page";
import { QueueCard } from "@/components/admin/queue-card";
import { StaffActions, type StaffActionValues } from "@/components/admin/staff-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { clientName, formatCurrency, formatDate, formatStatus } from "@/lib/admin/format";
import { loanActionsForStatus as actionsFor } from "@/lib/admin/rules/loan-actions";

import type { LoanQueueItem } from "@/lib/admin/types";

function MoneyValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-display font-bold tracking-tight [font-variant-numeric:tabular-nums]">
      {children}
    </span>
  );
}

export function LoanQueueCard({
  item,
  canMutate,
  busy,
  error,
  success,
  submit,
}: {
  item: LoanQueueItem;
  canMutate: boolean;
  busy: boolean;
  error: Error | null;
  success: boolean;
  submit: (action: string, values: StaffActionValues) => void;
}) {
  const actions = actionsFor(item.status);
  const approved = item.approvedAmount ? formatCurrency(item.approvedAmount) : "En attente";
  const method = item.requestedDisbursementMethod
    ? formatStatus(item.requestedDisbursementMethod)
    : "Non choisi";
  return (
    <QueueCard
      className="border-l-[3px] border-l-accent"
      title={clientName(item.client)}
      subtitle={item.productName}
      status={<StatusBadge status={item.status} />}
      facts={[
        {
          label: "Montant demandé",
          value: <MoneyValue>{formatCurrency(item.amount)}</MoneyValue>,
        },
        { label: "Montant approuvé", value: <MoneyValue>{approved}</MoneyValue> },
        { label: "Durée", value: `${item.durationMonths} mois` },
        { label: "Décaissement", value: method },
        { label: "Objet", value: item.purpose ?? "Non renseigné" },
        { label: "Créé le", value: formatDate(item.createdAt) },
      ]}
    >
      {canMutate && actions.length ? (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Actions du dossier
          </p>
          <StaffActions actions={actions} busy={busy} onSubmit={submit} />
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          Aucune action disponible pour ce dossier.
        </p>
      )}
      <MutationFeedback error={error} success={success} />
    </QueueCard>
  );
}

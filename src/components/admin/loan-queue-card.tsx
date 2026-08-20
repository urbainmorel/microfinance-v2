import { MutationFeedback } from "@/components/admin/admin-page";
import { QueueCard } from "@/components/admin/queue-card";
import {
  StaffActions,
  type StaffAction,
  type StaffActionValues,
} from "@/components/admin/staff-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { clientName, formatCurrency, formatDate, formatStatus } from "@/lib/admin/format";

import type { LoanQueueItem } from "@/lib/admin/types";

function actionsFor(status: string): StaffAction[] {
  if (status === "SUBMITTED" || status === "INFO_REQUESTED") {
    return [
      { value: "ANALYZE", label: "Démarrer l’analyse", tone: "accent" },
      { value: "REJECT", label: "Rejeter", requiresReason: true },
    ];
  }
  if (status === "IN_ANALYSIS") {
    return [
      { value: "PRE_APPROVE", label: "Pré-approuver", requiresAmount: true, tone: "accent" },
      {
        value: "REQUEST_INFO",
        label: "Demander un complément",
        requiresReason: true,
        tone: "outline",
      },
      { value: "REJECT", label: "Rejeter", requiresReason: true },
    ];
  }
  if (status === "PRE_APPROVED") {
    return [
      { value: "ACCEPT", label: "Accepter", tone: "accent" },
      { value: "REJECT", label: "Rejeter", requiresReason: true },
    ];
  }
  const ready = status === "GUARANTEE_COMPLETE" || status === "AWAITING_DISBURSEMENT";
  return ready
    ? [{ value: "DISBURSE", label: "Décaisser", requiresReference: true, tone: "accent" }]
    : [];
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
      title={clientName(item.client)}
      subtitle={item.productName}
      status={<StatusBadge status={item.status} />}
      facts={[
        { label: "Montant demandé", value: formatCurrency(item.amount) },
        { label: "Montant approuvé", value: approved },
        { label: "Durée", value: `${item.durationMonths} mois` },
        { label: "Décaissement", value: method },
        { label: "Objet", value: item.purpose ?? "Non renseigné" },
        { label: "Créé le", value: formatDate(item.createdAt) },
      ]}
    >
      {canMutate && actions.length ? (
        <StaffActions actions={actions} busy={busy} onSubmit={submit} />
      ) : (
        <p className="text-sm text-muted-foreground">Aucune action disponible pour ce dossier.</p>
      )}
      <MutationFeedback error={error} success={success} />
    </QueueCard>
  );
}

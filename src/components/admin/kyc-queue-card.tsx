import { MutationFeedback } from "@/components/admin/admin-page";
import { QueueCard } from "@/components/admin/queue-card";
import { StaffActions } from "@/components/admin/staff-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

import type { KycQueueItem } from "@/lib/admin/types";

const LABELS: Record<string, string> = {
  ID_FRONT: "Pièce — recto",
  ID_BACK: "Pièce — verso",
  SELFIE: "Selfie de contrôle",
};

function isComplete(item: KycQueueItem) {
  const types = new Set(item.documents.map((document) => document.type));
  return (
    types.has("ID_FRONT") && types.has("SELFIE") && (item.idType !== "CNI" || types.has("ID_BACK"))
  );
}

function facts(item: KycQueueItem) {
  return [
    {
      label: "Pièce",
      value: [item.idType, item.idNumber].filter(Boolean).join(" · ") || "Non renseignée",
    },
    {
      label: "Localité",
      value: [item.city, item.country].filter(Boolean).join(", ") || "Non renseignée",
    },
    { label: "Profession", value: item.profession ?? "Non renseignée" },
    {
      label: "Revenu estimé",
      value: item.monthlyIncomeEstimate
        ? formatCurrency(item.monthlyIncomeEstimate)
        : "Non renseigné",
    },
    { label: "Créé le", value: formatDate(item.createdAt) },
  ];
}

export function KycQueueCard({
  item,
  canReview,
  busy,
  error,
  success,
  onReview,
}: {
  item: KycQueueItem;
  canReview: boolean;
  busy: boolean;
  error: Error | null;
  success: boolean;
  onReview: (action: string, reason: string | null) => void;
}) {
  const complete = isComplete(item);
  const actionable =
    canReview && ["PENDING", "IN_REVIEW", "INFO_REQUESTED"].includes(item.kycStatus);
  return (
    <QueueCard
      title={`${item.firstname} ${item.lastname}`}
      subtitle={item.phone ?? "Téléphone non renseigné"}
      status={<StatusBadge status={item.kycStatus} />}
      facts={facts(item)}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {item.documents.map((document) => (
          <a
            key={document.type}
            href={document.url}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
          >
            {LABELS[document.type] ?? document.type}
          </a>
        ))}
      </div>
      {!complete ? (
        <p className="rounded-xl bg-warning/10 p-3 text-sm font-semibold text-warning">
          Dossier documentaire incomplet : la validation doit rester bloquée.
        </p>
      ) : null}
      {actionable ? (
        <StaffActions
          busy={busy}
          actions={[
            { value: "VALIDATE", label: "Valider", tone: "accent", disabled: !complete },
            {
              value: "REQUEST_INFO",
              label: "Demander un complément",
              requiresReason: true,
              tone: "outline",
            },
            { value: "REJECT", label: "Rejeter", requiresReason: true },
          ]}
          onSubmit={(action, values) => onReview(action, values.reason)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Consultation en lecture seule.</p>
      )}
      <MutationFeedback error={error} success={success} />
    </QueueCard>
  );
}

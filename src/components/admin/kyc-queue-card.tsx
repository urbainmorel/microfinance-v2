import { CheckCircle2, Clock3, ExternalLink, FileText } from "lucide-react";

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
  const types = new Set(
    item.documents.filter((document) => document.verified).map((document) => document.type),
  );
  return (
    types.has("ID_FRONT") &&
    types.has("SELFIE") &&
    (item.idType === "PASSPORT" || types.has("ID_BACK"))
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

function DocumentReview({
  document,
  canReview,
  busy,
  onReview,
}: {
  document: KycQueueItem["documents"][number];
  canReview: boolean;
  busy: boolean;
  onReview: (id: string, verified: boolean, reason: string | null) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-accent">
          <FileText className="size-[17px]" strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground">
            {LABELS[document.type] ?? document.type}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            {document.verified ? (
              <CheckCircle2 className="size-3.5 text-success" strokeWidth={1.9} aria-hidden />
            ) : (
              <Clock3 className="size-3.5 text-warning" strokeWidth={1.9} aria-hidden />
            )}
            {document.verified ? "Pièce contrôlée" : "Contrôle requis"}
          </p>
        </div>
      </div>
      <a
        href={document.url}
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 w-full")}
      >
        Ouvrir la pièce <ExternalLink aria-hidden />
      </a>
      {canReview && !document.verified ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onReview(document.id, true, null)}
          className={cn(buttonVariants({ variant: "accent", size: "sm" }), "mt-2 w-full")}
        >
          Confirmer la pièce
        </button>
      ) : null}
    </div>
  );
}

export function KycQueueCard({
  item,
  canReview,
  busy,
  error,
  success,
  onReview,
  onDocumentReview,
}: {
  item: KycQueueItem;
  canReview: boolean;
  busy: boolean;
  error: Error | null;
  success: boolean;
  onReview: (action: string, reason: string | null) => void;
  onDocumentReview: (id: string, verified: boolean, reason: string | null) => void;
}) {
  const complete = isComplete(item);
  const actionable =
    canReview && ["PENDING", "IN_REVIEW", "INFO_REQUESTED"].includes(item.kycStatus);
  return (
    <QueueCard
      className="border-l-[3px] border-l-accent"
      title={`${item.firstname} ${item.lastname}`}
      subtitle={item.phone ?? "Téléphone non renseigné"}
      status={<StatusBadge status={item.kycStatus} />}
      facts={facts(item)}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {item.documents.map((document) => (
          <DocumentReview
            key={document.id}
            document={document}
            canReview={canReview}
            busy={busy}
            onReview={onDocumentReview}
          />
        ))}
      </div>
      {!complete ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-pastel-gold bg-pastel-gold p-3 text-sm font-semibold leading-5 text-foreground">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.8} aria-hidden />
          <span>
            Toutes les pièces obligatoires doivent être consultées et confirmées avant validation.
          </span>
        </p>
      ) : null}
      {actionable ? (
        <div className="mt-4 space-y-3 border-t border-separator pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Décision de conformité
          </p>
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
        </div>
      ) : (
        <p className="mt-4 border-t border-separator pt-4 text-sm leading-6 text-muted-foreground">
          Consultation en lecture seule.
        </p>
      )}
      <MutationFeedback error={error} success={success} />
    </QueueCard>
  );
}

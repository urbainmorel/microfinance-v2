import { ShieldX, UserRoundX } from "lucide-react";

import { MutationFeedback } from "@/components/admin/admin-page";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { clientName, formatDate } from "@/lib/admin/format";

import type { DataErasureRequestItem } from "@/lib/admin/types";
import type { PrivacyAction } from "@/lib/admin/use-privacy-requests";

function RequestFacts({ request }: { request: DataErasureRequestItem }) {
  return (
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="font-bold text-muted-foreground">Demandée le</dt>
        <dd className="mt-1">{formatDate(request.createdAt)}</dd>
      </div>
      <div>
        <dt className="font-bold text-muted-foreground">Traitée le</dt>
        <dd className="mt-1">
          {request.processedAt ? formatDate(request.processedAt) : "Non traitée"}
        </dd>
      </div>
      <div>
        <dt className="font-bold text-muted-foreground">Motif enregistré</dt>
        <dd className="mt-1 break-words">{request.reason ?? "Non renseigné"}</dd>
      </div>
    </dl>
  );
}

function PrivacyActions({
  reason,
  pending,
  setReason,
  submit,
}: {
  reason: string;
  pending: boolean;
  setReason: (reason: string) => void;
  submit: (action: PrivacyAction) => void;
}) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <label className="text-sm font-bold">
        Motif de la décision
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={1000}
          disabled={pending}
          className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 font-normal"
          placeholder="Motif obligatoire"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!reason.trim() || pending}
          onClick={() => submit("REJECT")}
        >
          <ShieldX className="size-4" /> Rejeter
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!reason.trim() || pending}
          onClick={() => submit("ANONYMIZE")}
        >
          <UserRoundX className="size-4" /> Anonymiser
        </Button>
      </div>
    </div>
  );
}

export function PrivacyRequestCard({
  request,
  canProcess,
  reason,
  pending,
  error,
  success,
  setReason,
  submit,
}: {
  request: DataErasureRequestItem;
  canProcess: boolean;
  reason: string;
  pending: boolean;
  error: Error | null;
  success: boolean;
  setReason: (reason: string) => void;
  submit: (action: PrivacyAction) => void;
}) {
  const actionable = canProcess && request.status === "PENDING";
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">{clientName(request.requester)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.requester?.phone ?? "Téléphone non renseigné"}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <RequestFacts request={request} />
      {actionable ? (
        <PrivacyActions reason={reason} pending={pending} setReason={setReason} submit={submit} />
      ) : (
        <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
          Consultation en lecture seule.
        </p>
      )}
      <MutationFeedback error={error} success={success} />
    </article>
  );
}

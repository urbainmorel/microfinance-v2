"use client";

import { useQuery } from "@tanstack/react-query";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { QueueCard } from "@/components/admin/queue-card";
import { getAuditQueue } from "@/lib/admin/api";
import { clientName, formatDate, formatRole, formatStatus } from "@/lib/admin/format";
import { adminKeys } from "@/lib/admin/hooks";

function JsonDetails({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <details className="rounded-xl border border-border bg-card px-3 py-2">
      <summary className="cursor-pointer text-xs font-bold text-muted-foreground">{label}</summary>
      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all text-xs text-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export default function AdminAuditPage() {
  const query = useQuery({ queryKey: adminKeys.audit, queryFn: getAuditQueue });

  return (
    <>
      <AdminPageHeader
        eyebrow="Traçabilité"
        title="Journal d’audit"
        description="Les 100 événements les plus récents. Cette vue est strictement en lecture seule."
      />
      {query.isPending ? <AdminLoading /> : null}
      {query.isError ? <AdminError message={query.error.message} /> : null}
      {query.data?.length === 0 ? <AdminEmpty label="Aucun événement d’audit" /> : null}
      <div className="space-y-4">
        {query.data?.map((item) => (
          <QueueCard
            key={item.id}
            title={formatStatus(item.actionType)}
            subtitle={formatDate(item.createdAt)}
            status={
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                {formatRole(item.userRole)}
              </span>
            }
            facts={[
              { label: "Acteur", value: clientName(item.actor) },
              { label: "Cible", value: item.targetId ?? "Non renseignée" },
              { label: "Motif", value: item.reason ?? "Aucun motif" },
            ]}
          >
            <div className="grid gap-2 md:grid-cols-2">
              <JsonDetails label="Valeur précédente" value={item.oldValue} />
              <JsonDetails label="Nouvelle valeur" value={item.newValue} />
            </div>
          </QueueCard>
        ))}
      </div>
    </>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  MutationFeedback,
} from "@/components/admin/admin-page";
import { TemplateEditor } from "@/components/admin/template-editor";
import { Button } from "@/components/ui/button";
import { getNotificationTemplates, saveNotificationTemplate } from "@/lib/admin/api-templates";
import { useAdminMutation } from "@/lib/admin/hooks";

import type { NotificationTemplate } from "@/lib/admin/api-templates";

const KEY = ["admin", "templates"] as const;

function getCategory(slug: string): string {
  if (slug.startsWith("kyc_")) return "KYC";
  if (slug.startsWith("deposit_") || slug.startsWith("withdrawal_")) return "Opérations";
  if (slug.startsWith("loan") || slug.startsWith("installment") || slug.startsWith("repayment")) {
    return "Crédits";
  }
  return "Sécurité";
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: NotificationTemplate;
  onSelect: (t: NotificationTemplate) => void;
}) {
  const category = getCategory(template.slug);
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {category}
            </span>
            <p className="font-mono text-xs font-bold text-foreground">{template.slug}</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
            {template.language.toUpperCase()}
          </span>
        </div>
        <h3 className="mt-2 text-sm font-semibold text-foreground">{template.subject}</h3>
        {template.variables && template.variables.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {template.variables.map((v) => (
              <span
                key={v}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-xs text-muted-foreground">
          {template.variables?.length || 0} variable(s)
        </span>
        <Button size="sm" variant="outline" onClick={() => onSelect(template)}>
          Personnaliser
        </Button>
      </div>
    </div>
  );
}

export default function AdminTemplatesPage() {
  const query = useQuery({ queryKey: KEY, queryFn: getNotificationTemplates });
  const [selected, setSelected] = useState<NotificationTemplate | null>(null);
  const mutation = useAdminMutation(saveNotificationTemplate, [KEY]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Communication"
        title="Modèles de notification"
        description="Gérez les courriels français et anglais utilisés par les événements automatiques."
      />
      {query.isPending ? <AdminLoading /> : null}
      {query.isError ? <AdminError message={query.error.message} /> : null}
      {query.data?.length === 0 ? <AdminEmpty label="Aucun modèle" /> : null}
      {selected ? (
        <TemplateEditor
          key={selected.id}
          template={selected}
          busy={mutation.isPending}
          onCancel={() => setSelected(null)}
          onSave={(val) => mutation.mutate(val, { onSuccess: () => setSelected(null) })}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {query.data?.map((t) => (
            <TemplateCard key={t.id} template={t} onSelect={setSelected} />
          ))}
        </div>
      )}
      <MutationFeedback error={mutation.error} success={mutation.isSuccess} />
    </>
  );
}

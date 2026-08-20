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
          onSave={(value) => mutation.mutate(value, { onSuccess: () => setSelected(null) })}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {query.data?.map((template) => (
            <div key={template.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold">{template.slug}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{template.subject}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">
                  {template.language.toUpperCase()}
                </span>
              </div>
              <Button
                className="mt-4"
                size="sm"
                variant="outline"
                onClick={() => setSelected(template)}
              >
                Modifier
              </Button>
            </div>
          ))}
        </div>
      )}
      <MutationFeedback error={mutation.error} success={mutation.isSuccess} />
    </>
  );
}

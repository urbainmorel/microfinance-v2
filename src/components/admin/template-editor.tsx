"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { NotificationTemplate } from "@/lib/admin/api-templates";

export function TemplateEditor({
  template,
  busy,
  onSave,
  onCancel,
}: {
  template: NotificationTemplate;
  busy: boolean;
  onSave: (value: Omit<NotificationTemplate, "id" | "updatedAt">) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBody] = useState(template.bodyHtml);
  const [variables, setVariables] = useState(template.variables.join(", "));
  const parsedVariables = variables
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            slug: template.slug,
            language: template.language,
            subject,
            bodyHtml,
            variables: parsedVariables,
          });
        }}
      >
        <h2 className="font-display text-xl font-bold">
          {template.slug} · {template.language.toUpperCase()}
        </h2>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase text-muted-foreground">Objet</span>
          <Input
            value={subject}
            maxLength={160}
            onChange={(event) => setSubject(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase text-muted-foreground">
            Variables séparées par des virgules
          </span>
          <Input value={variables} onChange={(event) => setVariables(event.target.value)} />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase text-muted-foreground">Corps HTML</span>
          <textarea
            rows={12}
            value={bodyHtml}
            onChange={(event) => setBody(event.target.value)}
            className="w-full rounded-xl border border-border bg-card p-3 font-mono text-sm"
          />
        </label>
        <div className="flex gap-2">
          <Button disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </form>
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Aperçu isolé</h2>
        <iframe
          title="Aperçu du modèle"
          sandbox=""
          srcDoc={bodyHtml}
          className="min-h-80 w-full rounded-2xl border border-border bg-white"
        />
      </section>
    </div>
  );
}

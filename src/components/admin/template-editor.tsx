"use client";

import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renderTemplatePreview, wrapInEmailLayout } from "@/lib/email-layout";

import type { NotificationTemplate } from "@/lib/admin/api-templates";

interface PreviewSectionProps {
  previewMode: "rendered" | "raw";
  onModeChange: (mode: "rendered" | "raw") => void;
  subject: string;
  previewHtml: string;
}

function findUndeclared(subject: string, body: string, vars: string[]): string[] {
  const text = `${subject} ${body}`;
  const matches = Array.from(text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g))
    .map((m) => m[1])
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  return Array.from(new Set(matches.filter((v) => !vars.includes(v))));
}

function buildPreview(
  bodyHtml: string,
  slug: string,
  subject: string,
  language: string,
  mode: "rendered" | "raw",
): string {
  if (mode === "raw") return bodyHtml;
  const filled = renderTemplatePreview(bodyHtml, slug);
  return wrapInEmailLayout(filled, { subject, language, templateSlug: slug });
}

function TemplateEditorPreview({
  previewMode,
  onModeChange,
  subject,
  previewHtml,
}: PreviewSectionProps) {
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <h2 className="font-display text-lg font-bold">Aperçu en direct</h2>
        <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => onModeChange("rendered")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              previewMode === "rendered"
                ? "bg-card font-bold text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Email complet
          </button>
          <button
            type="button"
            onClick={() => onModeChange("raw")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              previewMode === "raw"
                ? "bg-card font-bold text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Corps seul
          </button>
        </div>
      </div>

      {previewMode === "rendered" && (
        <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
          <p className="font-medium text-foreground">
            <span className="text-muted-foreground">Objet : </span>
            {subject || "(Sans objet)"}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Expéditeur : Azari Microfinance &lt;notifications@azari-microfinance.site&gt;
          </p>
        </div>
      )}

      <iframe
        title="Aperçu du modèle"
        sandbox=""
        srcDoc={previewHtml}
        className="min-h-[500px] w-full flex-1 rounded-xl border border-border bg-[#f8fafc]"
      />
    </section>
  );
}

function VariableChips({
  variables,
  onInsert,
}: {
  variables: string[];
  onInsert: (v: string) => void;
}) {
  if (variables.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">Insérer rapidement une variable :</span>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onInsert(v)}
            className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
          >
            +{`{{${v}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

interface FormProps {
  template: NotificationTemplate;
  subject: string;
  onSubjectChange: (s: string) => void;
  variables: string;
  onVariablesChange: (v: string) => void;
  bodyHtml: string;
  onBodyChange: (b: string) => void;
  parsedVariables: string[];
  undeclaredPlaceholders: string[];
  busy: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onInsertVariable: (token: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

function TemplateEditorForm({
  template,
  subject,
  onSubjectChange,
  variables,
  onVariablesChange,
  bodyHtml,
  onBodyChange,
  parsedVariables,
  undeclaredPlaceholders,
  busy,
  onSubmit,
  onCancel,
  onInsertVariable,
  textareaRef,
}: FormProps) {
  return (
    <form className="space-y-4 rounded-2xl border border-border bg-card p-5" onSubmit={onSubmit}>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <span className="font-mono text-xs uppercase text-muted-foreground">
            Modèle de courriel
          </span>
          <h2 className="font-display text-xl font-bold">{template.slug}</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary">
          {template.language.toUpperCase()}
        </span>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase text-muted-foreground">Objet du courriel</span>
        <Input value={subject} maxLength={160} onChange={(e) => onSubjectChange(e.target.value)} />
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase text-muted-foreground">
          Variables déclarées
        </span>
        <Input value={variables} onChange={(e) => onVariablesChange(e.target.value)} />
      </label>

      <VariableChips variables={parsedVariables} onInsert={onInsertVariable} />

      <label className="block space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-muted-foreground">Corps HTML</span>
          <span className="font-mono text-xs text-muted-foreground">{bodyHtml.length} car.</span>
        </div>
        <textarea
          ref={textareaRef}
          rows={13}
          value={bodyHtml}
          onChange={(e) => onBodyChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-card p-3 font-mono text-xs leading-relaxed"
        />
      </label>

      {undeclaredPlaceholders.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <strong>Variables non déclarées :</strong>{" "}
          {undeclaredPlaceholders.map((p) => `{{${p}}}`).join(", ")}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button disabled={busy || undeclaredPlaceholders.length > 0}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

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
  const [previewMode, setPreviewMode] = useState<"rendered" | "raw">("rendered");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parsedVars = useMemo(
    () =>
      variables
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [variables],
  );

  const undeclared = useMemo(
    () => findUndeclared(subject, bodyHtml, parsedVars),
    [subject, bodyHtml, parsedVars],
  );

  const preview = useMemo(
    () => buildPreview(bodyHtml, template.slug, subject, template.language, previewMode),
    [bodyHtml, template.slug, subject, template.language, previewMode],
  );

  function insertVar(name: string) {
    const token = `{{${name}}}`;
    const ta = textareaRef.current;
    if (!ta) {
      setBody((prev) => `${prev} ${token}`);
      return;
    }
    setBody(bodyHtml.slice(0, ta.selectionStart) + token + bodyHtml.slice(ta.selectionEnd));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (undeclared.length > 0) return;
    onSave({
      slug: template.slug,
      language: template.language,
      subject,
      bodyHtml,
      variables: parsedVars,
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <TemplateEditorForm
        template={template}
        subject={subject}
        onSubjectChange={setSubject}
        variables={variables}
        onVariablesChange={setVariables}
        bodyHtml={bodyHtml}
        onBodyChange={setBody}
        parsedVariables={parsedVars}
        undeclaredPlaceholders={undeclared}
        busy={busy}
        onSubmit={handleSave}
        onCancel={onCancel}
        onInsertVariable={insertVar}
        textareaRef={textareaRef}
      />
      <TemplateEditorPreview
        previewMode={previewMode}
        onModeChange={setPreviewMode}
        subject={subject}
        previewHtml={preview}
      />
    </div>
  );
}

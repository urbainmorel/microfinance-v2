"use client";

import { type FormEvent, useState } from "react";

import { Modal } from "@/components/ui/modal";

import type { KnowledgeItem } from "@/lib/chatbot/types";

interface KnowledgeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: KnowledgeItem | null;
  onSave: (item: {
    id?: string;
    title: string;
    category: string;
    content: string;
    isActive?: boolean;
  }) => Promise<void>;
  busy?: boolean;
}

interface FormFieldsProps {
  title: string;
  category: string;
  content: string;
  isActive: boolean;
  onTitleChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onIsActiveChange: (v: boolean) => void;
}

function KnowledgeFormFields({
  title,
  category,
  content,
  isActive,
  onTitleChange,
  onCategoryChange,
  onContentChange,
  onIsActiveChange,
}: FormFieldsProps) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">
          Titre de la fiche <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ex: Taux et conditions du Prêt Élevage"
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">Catégorie</label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="Prêts">Prêts & Financements</option>
            <option value="Épargne">Épargne & Placements</option>
            <option value="Garanties">Garanties & Cautions</option>
            <option value="KYC">KYC & Pièces Justificatives</option>
            <option value="Remboursement">Remboursement & Pénalités</option>
            <option value="Général">Informations Générales</option>
          </select>
        </div>

        <div className="flex items-center pt-5">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onIsActiveChange(e.target.checked)}
              className="size-4 rounded border-input text-accent focus:ring-accent"
            />
            <span className="text-xs font-medium text-foreground">
              Fiche active (utilisée par le bot)
            </span>
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">
          Contenu explicatif détaillé <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={7}
          required
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Rédigez les règles métier, taux applicables, montants min/max..."
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>
    </>
  );
}

interface FormContentProps {
  initial?: KnowledgeItem | null;
  onSave: KnowledgeFormModalProps["onSave"];
  onClose: () => void;
  busy: boolean;
}

function KnowledgeFormContent({ initial, onSave, onClose, busy }: FormContentProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Prêts");
  const [content, setContent] = useState(initial?.content ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Le titre et le contenu sont obligatoires.");
      return;
    }
    try {
      setError(null);
      await onSave({
        id: initial?.id,
        title: title.trim(),
        category: category.trim() || "Général",
        content: content.trim(),
        isActive,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
          {error}
        </div>
      ) : null}

      <KnowledgeFormFields
        title={title}
        category={category}
        content={content}
        isActive={isActive}
        onTitleChange={setTitle}
        onCategoryChange={setCategory}
        onContentChange={setContent}
        onIsActiveChange={setIsActive}
      />

      <div className="flex justify-end gap-2.5 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-accent-foreground hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Indexation vectorielle…" : "Enregistrer la fiche"}
        </button>
      </div>
    </form>
  );
}

export function KnowledgeFormModal({
  open,
  onOpenChange,
  initial,
  onSave,
  busy = false,
}: KnowledgeFormModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Modifier la fiche de connaissances" : "Ajouter une fiche de connaissances"}
      description="Ces informations sont vectorisées et directement utilisées par le chatbot pour répondre aux emprunteurs."
      className="max-w-2xl"
    >
      {open ? (
        <KnowledgeFormContent
          key={initial?.id ?? "new"}
          initial={initial}
          onSave={onSave}
          onClose={() => onOpenChange(false)}
          busy={busy}
        />
      ) : null}
    </Modal>
  );
}

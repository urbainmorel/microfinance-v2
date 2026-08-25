"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export interface StaffAction {
  disabled?: boolean;
  value: string;
  label: string;
  requiresReason?: boolean;
  requiresReference?: boolean;
  requiresAmount?: boolean;
  tone?: "primary" | "accent" | "outline";
}

export interface StaffActionValues {
  reason: string | null;
  reference: string | null;
  amount: number | null;
}

interface ActionDraft {
  reason: string;
  reference: string;
  amount: string;
}

const emptyDraft: ActionDraft = { reason: "", reference: "", amount: "" };

function actionVariant(action: StaffAction) {
  if (action.tone === "accent") return "accent";
  if (action.tone === "outline") return "outline";
  return "default";
}

function validateDraft(action: StaffAction, draft: ActionDraft): string | null {
  if (action.requiresReason && !draft.reason.trim()) return "Le motif est obligatoire.";
  if (action.requiresReference && !draft.reference.trim()) {
    return "La référence d’exécution est obligatoire.";
  }
  if (action.requiresAmount && Number(draft.amount) <= 0) {
    return "Le montant approuvé doit être supérieur à zéro.";
  }
  return null;
}

function ActionPicker({
  actions,
  busy,
  select,
}: {
  actions: StaffAction[];
  busy: boolean;
  select: (action: StaffAction) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.value}
          type="button"
          size="sm"
          variant={actionVariant(action)}
          disabled={busy || action.disabled}
          onClick={() => select(action)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function DraftFields({
  action,
  draft,
  setDraft,
}: {
  action: StaffAction;
  draft: ActionDraft;
  setDraft: React.Dispatch<React.SetStateAction<ActionDraft>>;
}) {
  return (
    <>
      {action.requiresReason ? (
        <textarea
          value={draft.reason}
          onChange={(event) => setDraft((value) => ({ ...value, reason: event.target.value }))}
          placeholder="Motif obligatoire"
          rows={3}
          className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-ring focus:ring-4 focus:ring-ring/10"
        />
      ) : null}
      {action.requiresReference ? (
        <Input
          value={draft.reference}
          onChange={(event) => setDraft((value) => ({ ...value, reference: event.target.value }))}
          placeholder="Référence d’exécution"
        />
      ) : null}
      {action.requiresAmount ? (
        <Input
          type="number"
          min={1}
          value={draft.amount}
          onChange={(event) => setDraft((value) => ({ ...value, amount: event.target.value }))}
          placeholder="Montant approuvé (FCFA)"
        />
      ) : null}
    </>
  );
}

export function StaffActions({
  actions,
  busy,
  onSubmit,
}: {
  actions: StaffAction[];
  busy: boolean;
  onSubmit: (action: string, values: StaffActionValues) => void;
}) {
  const [selected, setSelected] = useState<StaffAction | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const reset = () => {
    setSelected(null);
    setDraft(emptyDraft);
    setError(null);
  };
  const confirm = () => {
    if (!selected) return;
    const validation = validateDraft(selected, draft);
    if (validation) return setError(validation);
    onSubmit(selected.value, {
      reason: draft.reason.trim() || null,
      reference: draft.reference.trim() || null,
      amount: draft.amount ? Number(draft.amount) : null,
    });
    reset();
  };
  return (
    <>
      <ActionPicker actions={actions} busy={busy} select={setSelected} />
      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !busy) reset();
        }}
        title={selected ? `Confirmer : ${selected.label}` : "Confirmer l’action"}
        description="Vérifiez les informations requises avant d’enregistrer cette décision."
        className="max-w-lg"
      >
        {selected ? (
          <div className="space-y-4">
            <DraftFields action={selected} draft={draft} setDraft={setDraft} />
            {error ? <p className="text-sm font-semibold text-warning">{error}</p> : null}
            <div className="grid grid-cols-2 gap-3 border-t border-separator pt-5">
              <Button type="button" variant="outline" onClick={reset} disabled={busy}>
                Annuler
              </Button>
              <Button type="button" variant="accent" onClick={confirm} disabled={busy}>
                {busy ? "Traitement…" : "Confirmer"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

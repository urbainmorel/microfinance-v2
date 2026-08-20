"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { AppSettings } from "@/lib/admin/api-settings";

const FIELDS: Array<{ key: keyof AppSettings; label: string; min: number; max?: number }> = [
  { key: "withdrawalWindowStart", label: "Début des retraits (heure)", min: 0, max: 23 },
  { key: "withdrawalWindowEnd", label: "Fin des retraits (heure)", min: 1, max: 24 },
  { key: "withdrawalFee", label: "Frais de retrait (FCFA)", min: 0 },
  { key: "transferFee", label: "Frais de virement (FCFA)", min: 0 },
  { key: "defaultAfterDays", label: "Défaut après (jours)", min: 1, max: 365 },
  { key: "kycRetentionDays", label: "Rétention KYC (jours)", min: 1 },
  { key: "auditRetentionDays", label: "Rétention audit (jours)", min: 1 },
];

function validate(value: AppSettings) {
  if (value.withdrawalWindowEnd <= value.withdrawalWindowStart)
    return "L’heure de fin doit suivre l’heure de début.";
  if (
    FIELDS.some(
      (field) =>
        value[field.key] < field.min || (field.max !== undefined && value[field.key] > field.max),
    )
  )
    return "Un paramètre est hors limites.";
  return null;
}

export function SettingsForm({
  initial,
  busy,
  onSave,
}: {
  initial: AppSettings;
  busy: boolean;
  onSave: (value: AppSettings) => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="rounded-2xl border border-border bg-card p-5 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        const message = validate(value);
        setError(message);
        if (!message) onSave(value);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="space-y-2">
            <span className="text-xs font-bold uppercase text-muted-foreground">{field.label}</span>
            <Input
              type="number"
              min={field.min}
              max={field.max}
              step={1}
              value={value[field.key]}
              onChange={(event) =>
                setValue((current) => ({ ...current, [field.key]: Number(event.target.value) }))
              }
            />
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-warning">
          {error}
        </p>
      ) : null}
      <Button className="mt-5" disabled={busy}>
        {busy ? "Enregistrement…" : "Enregistrer les paramètres"}
      </Button>
    </form>
  );
}

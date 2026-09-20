"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { AppSettings } from "@/lib/admin/api-settings";

type NumericSettingKey = Exclude<keyof AppSettings, "platformName" | "autoLoanApproval">;

const NUMERIC_FIELDS: Array<{ key: NumericSettingKey; label: string; min: number; max?: number }> =
  [
    { key: "withdrawalWindowStart", label: "Début des retraits (heure)", min: 0, max: 23 },
    { key: "withdrawalWindowEnd", label: "Fin des retraits (heure)", min: 1, max: 24 },
    { key: "withdrawalFee", label: "Frais de retrait (FCFA)", min: 0 },
    { key: "transferFee", label: "Frais de virement (FCFA)", min: 0 },
    { key: "defaultAfterDays", label: "Défaut après (jours)", min: 1, max: 365 },
    { key: "kycRetentionDays", label: "Rétention KYC (jours)", min: 1 },
    { key: "auditRetentionDays", label: "Rétention audit (jours)", min: 1 },
  ];

function validate(value: AppSettings) {
  if (!value.platformName || !value.platformName.trim()) {
    return "Le nom de la plateforme ne peut pas être vide.";
  }
  if (value.withdrawalWindowEnd <= value.withdrawalWindowStart)
    return "L’heure de fin doit suivre l’heure de début.";
  if (
    NUMERIC_FIELDS.some(
      (field) =>
        value[field.key] < field.min || (field.max !== undefined && value[field.key] > field.max),
    )
  )
    return "Un paramètre est hors limites.";
  return null;
}

function PlatformNameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="mb-6 rounded-xl border border-border/70 bg-muted/20 p-4">
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Nom officiel de la plateforme
        </span>
        <Input
          type="text"
          required
          placeholder="Azari Microfinance"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="max-w-md font-semibold text-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Ce nom s’applique dynamiquement à la vitrine, à l’espace client et au centre d’opérations.
        </p>
      </label>
    </div>
  );
}

function ApprovalModeSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="mb-6 rounded-xl border border-border/70 bg-muted/20 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Mode d’approbation des demandes de prêt
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                enabled
                  ? "border border-accent/30 bg-accent/15 text-accent"
                  : "border border-border bg-muted text-muted-foreground",
              )}
            >
              {enabled ? "Automatique (Instant Loan)" : "Manuel (Comité de crédit)"}
            </span>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {enabled
              ? "Activé : Les demandes de prêt sont approuvées et prêtes pour signature électronique du contrat (~30s d’analyse)."
              : "Désactivé : Les demandes sont enregistrées en attente d’examen (SUBMITTED). L’équipe de crédit étudie et valide manuellement le déblocage."}
          </p>
        </div>
        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            onChange={(event) => onChange(event.target.checked)}
          />
          <div className="peer h-6 w-11 rounded-full bg-border transition-colors after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full" />
        </label>
      </div>
    </div>
  );
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = validate(value);
    setError(message);
    if (!message) onSave(value);
  }

  return (
    <form
      className="rounded-2xl border border-border bg-card p-5 shadow-card"
      onSubmit={handleSubmit}
    >
      <PlatformNameField
        value={value.platformName}
        onChange={(platformName) => setValue((curr) => ({ ...curr, platformName }))}
      />

      <ApprovalModeSwitch
        enabled={value.autoLoanApproval}
        onChange={(autoLoanApproval) => setValue((curr) => ({ ...curr, autoLoanApproval }))}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {NUMERIC_FIELDS.map((field) => (
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

      {error ? <p className="mt-4 text-xs font-semibold text-destructive">{error}</p> : null}

      <div className="mt-6 flex justify-end">
        <Button type="submit" variant="accent" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
      </div>
    </form>
  );
}

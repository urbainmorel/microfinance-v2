import { Input } from "@/components/ui/input";

import type { LoanProductInput } from "@/lib/admin/types";

type ProductSetter = <K extends keyof LoanProductInput>(key: K, value: LoanProductInput[K]) => void;
type NumericKey = Exclude<
  keyof LoanProductInput,
  "name" | "description" | "interestMethod" | "isActive"
>;

const numericFields: Array<{ label: string; key: NumericKey; min?: number; step?: number }> = [
  { label: "Montant minimum", key: "minAmount", min: 1 },
  { label: "Montant maximum", key: "maxAmount", min: 1 },
  { label: "Taux d’intérêt annuel (%)", key: "interestRate", step: 0.01 },
  { label: "Durée minimum (mois)", key: "minDurationMonths", min: 1 },
  { label: "Durée maximum (mois)", key: "maxDurationMonths", min: 1 },
  { label: "Garantie (%)", key: "guaranteeRate", step: 0.001 },
  { label: "Frais dossier (%)", key: "processingFeePercent", step: 0.001 },
  { label: "Frais dossier fixes", key: "processingFeeFlat" },
  { label: "Frais gestion (%)", key: "managementFeePercent", step: 0.001 },
  { label: "Frais gestion fixes", key: "managementFeeFlat" },
  { label: "Assurance (%)", key: "insuranceRate", step: 0.001 },
  { label: "Épargne obligatoire (%)", key: "mandatorySavingsRate", step: 0.001 },
  { label: "Pénalité journalière (%)", key: "latePenaltyRate", step: 0.001 },
];

export function ProductFormFields({
  value,
  setValue,
}: {
  value: LoanProductInput;
  setValue: ProductSetter;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <label className="space-y-2 md:col-span-2">
        <span className="text-[13px] font-semibold text-foreground">Nom</span>
        <Input value={value.name} onChange={(event) => setValue("name", event.target.value)} />
      </label>
      <label className="space-y-2">
        <span className="text-[13px] font-semibold text-foreground">Méthode d’intérêt</span>
        <select
          value={value.interestMethod}
          onChange={(event) =>
            setValue("interestMethod", event.target.value as LoanProductInput["interestMethod"])
          }
          className="h-[52px] w-full rounded-xl border border-input bg-card px-4 outline-none focus:border-ring focus:ring-4 focus:ring-ring/10"
        >
          <option value="CONSTANT_INSTALLMENT">Échéance constante</option>
        </select>
      </label>
      <label className="space-y-2 md:col-span-2 xl:col-span-3">
        <span className="text-[13px] font-semibold text-foreground">Description</span>
        <textarea
          value={value.description ?? ""}
          onChange={(event) => setValue("description", event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:border-ring focus:ring-4 focus:ring-ring/10"
        />
      </label>
      {numericFields.map((field) => (
        <label key={field.key} className="space-y-2">
          <span className="text-[13px] font-semibold text-foreground">{field.label}</span>
          <Input
            type="number"
            min={field.min ?? 0}
            step={field.step ?? 1}
            value={value[field.key]}
            onChange={(event) => setValue(field.key, Number(event.target.value))}
          />
        </label>
      ))}
    </div>
  );
}

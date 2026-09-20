"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import { SearchableSelectField } from "@/components/ui/searchable-select-field";
import { SelectField } from "@/components/ui/select-field";
import { FCFA_COUNTRIES, type KycField, type KycInput } from "@/lib/schemas/kyc";

type FieldMeta = {
  label: string;
  type?: string;
  inputMode?: "numeric" | "tel";
  placeholder?: string;
  searchable?: boolean;
  options?: readonly { value: string; label: string }[];
};

const FIELD_META: Record<KycField, FieldMeta> = {
  birth_date: { label: "Date de naissance", type: "date" },
  country: {
    label: "Pays de résidence",
    placeholder: "Rechercher un pays…",
    searchable: true,
    options: FCFA_COUNTRIES,
  },
  city: { label: "Ville" },
  address: { label: "Adresse précise" },
  phone: { label: "Téléphone", type: "tel", inputMode: "tel", placeholder: "+225…" },
  profession: { label: "Profession" },
  monthly_income_estimate: {
    label: "Revenu mensuel estimé (FCFA)",
    type: "number",
    inputMode: "numeric",
  },
  id_type: {
    label: "Type de pièce",
    options: [
      { value: "CNI", label: "CNI" },
      { value: "PASSPORT", label: "Passeport" },
      { value: "PERMIS", label: "Permis de conduire" },
    ],
  },
  id_number: { label: "Numéro de la pièce" },
  id_expiry: { label: "Date d'expiration", type: "date" },
  income_source: { label: "Source principale de revenus" },
  monthly_charges: { label: "Charges mensuelles (FCFA)", type: "number", inputMode: "numeric" },
  momo_operator: { label: "Opérateur Mobile Money", placeholder: "MTN, Orange, Moov…" },
  momo_number: { label: "Numéro Mobile Money", type: "tel", inputMode: "tel" },
  usual_bank: { label: "Banque habituelle" },
};

/** Rend le contrôle adapté à un champ KYC (autocomplétion, select natif ou input labellisé). */
export function FieldControl({ name, form }: { name: KycField; form: UseFormReturn<KycInput> }) {
  const meta = FIELD_META[name];
  const error = form.formState.errors[name]?.message;

  if (meta.searchable && meta.options) {
    return (
      <Controller
        name={name}
        control={form.control}
        render={({ field }) => (
          <SearchableSelectField
            id={name}
            label={meta.label}
            placeholder={meta.placeholder ?? "Rechercher…"}
            options={meta.options ?? []}
            value={field.value as string | undefined}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={error}
          />
        )}
      />
    );
  }

  if (meta.options) {
    return (
      <SelectField
        id={name}
        label={meta.label}
        placeholder={meta.placeholder ?? "Sélectionner…"}
        options={meta.options}
        {...form.register(name)}
        error={error}
      />
    );
  }
  return (
    <FormField
      id={name}
      label={meta.label}
      type={meta.type}
      inputMode={meta.inputMode}
      placeholder={meta.placeholder}
      {...form.register(name)}
      error={error}
    />
  );
}

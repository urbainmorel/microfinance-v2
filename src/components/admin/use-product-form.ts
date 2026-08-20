"use client";

import { useState } from "react";

import type { LoanProduct, LoanProductInput } from "@/lib/admin/types";

const emptyProduct: LoanProductInput = {
  name: "",
  description: null,
  minAmount: 0,
  maxAmount: 0,
  minDurationMonths: 1,
  maxDurationMonths: 12,
  interestRate: 0,
  interestMethod: "CONSTANT_INSTALLMENT",
  processingFeePercent: 0,
  processingFeeFlat: 0,
  managementFeePercent: 0,
  managementFeeFlat: 0,
  insuranceRate: 0,
  guaranteeRate: 0,
  mandatorySavingsRate: 0,
  latePenaltyRate: 0,
  isActive: false,
};

function validateProduct(value: LoanProductInput): string | null {
  if (!value.name.trim()) return "Le nom du produit est obligatoire.";
  if (value.minAmount <= 0 || value.maxAmount < value.minAmount) {
    return "Les bornes de montant sont invalides.";
  }
  if (value.minDurationMonths <= 0 || value.maxDurationMonths < value.minDurationMonths) {
    return "Les bornes de durée sont invalides.";
  }
  const rates = [
    value.interestRate,
    value.processingFeePercent,
    value.managementFeePercent,
    value.insuranceRate,
    value.guaranteeRate,
    value.mandatorySavingsRate,
    value.latePenaltyRate,
  ];
  return rates.some((rate) => rate < 0) ? "Les taux ne peuvent pas être négatifs." : null;
}

export function useProductForm(
  product: LoanProduct | undefined,
  onSave: (input: LoanProductInput) => void,
) {
  const [value, setValue] = useState<LoanProductInput>(product ?? emptyProduct);
  const [error, setError] = useState<string | null>(null);
  const setField = <K extends keyof LoanProductInput>(key: K, next: LoanProductInput[K]) => {
    setValue((current) => ({ ...current, [key]: next }));
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateProduct(value);
    setError(validation);
    if (!validation) {
      onSave({ ...value, name: value.name.trim(), description: value.description?.trim() || null });
    }
  };
  return { value, error, setField, submit };
}

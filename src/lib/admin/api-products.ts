import { adminSupabase, type DbRecord } from "./api-client";

import type { LoanProductInput } from "./types";

function productPayload(input: LoanProductInput): DbRecord {
  return {
    name: input.name,
    description: input.description,
    min_amount: input.minAmount,
    max_amount: input.maxAmount,
    min_duration_months: input.minDurationMonths,
    max_duration_months: input.maxDurationMonths,
    interest_rate: input.interestRate,
    interest_method: input.interestMethod,
    processing_fee_percent: input.processingFeePercent,
    processing_fee_flat: input.processingFeeFlat,
    management_fee_percent: input.managementFeePercent,
    management_fee_flat: input.managementFeeFlat,
    insurance_rate: input.insuranceRate,
    guarantee_rate: input.guaranteeRate,
    mandatory_savings_rate: input.mandatorySavingsRate,
    late_penalty_rate: input.latePenaltyRate,
    is_active: input.isActive,
  };
}

export async function createLoanProduct(input: LoanProductInput): Promise<void> {
  const { error } = await adminSupabase.from("loan_products").insert(productPayload(input));
  if (error) throw new Error(error.message);
}

export async function updateLoanProduct(id: string, input: LoanProductInput): Promise<void> {
  const { error } = await adminSupabase.rpc("revise_loan_product", {
    p_product: id,
    p_values: input,
  });
  if (error) throw new Error(error.message);
}

export async function deactivateLoanProduct(id: string): Promise<void> {
  const { error } = await adminSupabase
    .from("loan_products")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

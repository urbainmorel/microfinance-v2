import {
  adminSupabase,
  getClientMap,
  numberValue,
  optionalNumber,
  optionalText,
  rows,
  textValue,
  type DbRecord,
} from "./api-client";

import type { ClientSummary, LoanProduct, LoanQueueItem } from "./types";

export async function getLoanQueue(): Promise<LoanQueueItem[]> {
  const { data, error } = await adminSupabase
    .from("loan_requests")
    .select(
      "id, client_id, product_id, amount, duration_months, purpose, status, approved_amount, requested_disbursement_method, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const records = rows(data);
  const productIds = [...new Set(records.map((row) => textValue(row.product_id)).filter(Boolean))];
  const [clients, productsResponse] = await Promise.all([
    getClientMap(records.map((row) => textValue(row.client_id))),
    adminSupabase.from("loan_products").select("id, name").in("id", productIds),
  ]);
  if (productsResponse.error) throw new Error(productsResponse.error.message);
  const products = new Map(
    rows(productsResponse.data).map((row) => [textValue(row.id), textValue(row.name)]),
  );
  return records.map((row) => mapLoan(row, clients, products));
}

function mapLoan(
  row: DbRecord,
  clients: Map<string, ClientSummary>,
  products: Map<string, string>,
): LoanQueueItem {
  const clientId = textValue(row.client_id);
  return {
    id: textValue(row.id),
    clientId,
    client: clients.get(clientId) ?? null,
    productName: products.get(textValue(row.product_id)) ?? "Produit inconnu",
    amount: numberValue(row.amount),
    durationMonths: numberValue(row.duration_months),
    purpose: optionalText(row.purpose),
    status: textValue(row.status),
    approvedAmount: optionalNumber(row.approved_amount),
    requestedDisbursementMethod: optionalText(row.requested_disbursement_method),
    createdAt: textValue(row.created_at),
  };
}

export function mapProduct(row: DbRecord): LoanProduct {
  return {
    id: textValue(row.id),
    name: textValue(row.name),
    description: optionalText(row.description),
    minAmount: numberValue(row.min_amount),
    maxAmount: numberValue(row.max_amount),
    minDurationMonths: numberValue(row.min_duration_months),
    maxDurationMonths: numberValue(row.max_duration_months),
    interestRate: numberValue(row.interest_rate),
    interestMethod: row.interest_method === "DEGRESSIVE" ? "DEGRESSIVE" : "CONSTANT_INSTALLMENT",
    processingFeePercent: numberValue(row.processing_fee_percent),
    processingFeeFlat: numberValue(row.processing_fee_flat),
    managementFeePercent: numberValue(row.management_fee_percent),
    managementFeeFlat: numberValue(row.management_fee_flat),
    insuranceRate: numberValue(row.insurance_rate),
    guaranteeRate: numberValue(row.guarantee_rate),
    mandatorySavingsRate: numberValue(row.mandatory_savings_rate),
    latePenaltyRate: numberValue(row.late_penalty_rate),
    isActive: row.is_active !== false,
    createdAt: textValue(row.created_at),
  };
}

export async function getLoanProducts(): Promise<LoanProduct[]> {
  const { data, error } = await adminSupabase
    .from("loan_products")
    .select("*")
    .is("retired_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return rows(data).map(mapProduct);
}

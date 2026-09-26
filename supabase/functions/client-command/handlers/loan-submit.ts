import {
  assertExactKeys,
  enumValue,
  nonNegativeAmount,
  ownedDocumentPaths,
  positiveAmount,
  positiveInteger,
  requiredString,
  uuid,
} from "../validation.ts";
import type { JsonObject, ValidatedCommand } from "../types.ts";

export function handleLoanSubmit(
  payload: JsonObject,
  userId: string,
  idempotencyKey: string,
  correlationId: string,
): ValidatedCommand {
  assertExactKeys(
    payload,
    ["productId", "amount", "durationMonths", "purpose", "disbursementMethod"],
    ["monthlyIncomeEstimate", "documentPaths"],
  );
  return {
    rpc: "create_loan_request",
    args: {
      p_client: userId,
      p_correlation_id: correlationId,
      p_idempotency_key: idempotencyKey,
      p_product: uuid(payload.productId),
      p_amount: positiveAmount(payload.amount),
      p_duration: positiveInteger(payload.durationMonths, 600),
      p_purpose: requiredString(payload.purpose, 1_000),
      p_monthly_income: nonNegativeAmount(payload.monthlyIncomeEstimate),
      p_disbursement_method: enumValue(payload.disbursementMethod, [
        "INTERNAL",
        "MOBILE_MONEY",
        "BANK_TRANSFER",
      ] as const),
      p_documents: ownedDocumentPaths(payload.documentPaths, userId),
    },
    fallbackStatus: "ACTIVE",
  };
}

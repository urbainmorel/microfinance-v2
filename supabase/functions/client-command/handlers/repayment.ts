import {
  assertExactKeys,
  enumValue,
  positiveAmount,
  proofPath,
  requiredElectronicReference,
  uuid,
} from "../validation.ts";
import type { JsonObject, ValidatedCommand } from "../types.ts";

export function handleRepayment(
  payload: JsonObject,
  userId: string,
  idempotencyKey: string,
  correlationId: string,
): ValidatedCommand {
  assertExactKeys(payload, ["loanId", "amount", "paymentMethod", "proofPath"], ["reference"]);
  const paymentMethod = enumValue(payload.paymentMethod, [
    "CASH",
    "MOBILE_MONEY",
    "BANK_TRANSFER",
  ] as const);

  return {
    rpc: "create_repayment_request",
    args: {
      p_client: userId,
      p_correlation_id: correlationId,
      p_idempotency_key: idempotencyKey,
      p_loan: uuid(payload.loanId),
      p_amount: positiveAmount(payload.amount),
      p_payment_method: paymentMethod,
      p_reference: requiredElectronicReference(paymentMethod, payload.reference),
      p_proof_path: proofPath(payload.proofPath),
    },
    fallbackStatus: "PENDING",
  };
}

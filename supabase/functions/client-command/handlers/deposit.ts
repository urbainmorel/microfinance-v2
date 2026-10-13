import {
  assertExactKeys,
  enumValue,
  optionalString,
  positiveAmount,
  proofPath,
  requiredElectronicReference,
} from "../validation.ts";
import type { JsonObject, ValidatedCommand } from "../types.ts";

export function handleDeposit(
  payload: JsonObject,
  userId: string,
  idempotencyKey: string,
  correlationId: string,
): ValidatedCommand {
  assertExactKeys(payload, ["amount", "motif", "paymentMethod", "proofPath"], ["reference"]);
  const paymentMethod = enumValue(payload.paymentMethod, [
    "CASH",
    "MOBILE_MONEY",
    "BANK_TRANSFER",
  ] as const);

  const motif = enumValue(payload.motif, ["FREE_SAVINGS", "GUARANTEE", "REPAYMENT"] as const);

  return {
    rpc: "create_deposit_request",
    args: {
      p_client: userId,
      p_correlation_id: correlationId,
      p_idempotency_key: idempotencyKey,
      p_amount: positiveAmount(payload.amount),
      p_motif: motif,
      p_payment_method: paymentMethod,
      p_reference:
        motif === "GUARANTEE"
          ? optionalString(payload.reference, 120)
          : requiredElectronicReference(paymentMethod, payload.reference),
      p_proof_path: proofPath(payload.proofPath),
    },
    fallbackStatus: "PENDING",
  };
}

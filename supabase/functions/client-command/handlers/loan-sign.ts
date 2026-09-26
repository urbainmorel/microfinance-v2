import { assertExactKeys, uuid } from "../validation.ts";
import type { JsonObject, ValidatedCommand } from "../types.ts";

export function handleLoanContractSign(
  payload: JsonObject,
  userId: string,
  idempotencyKey: string,
  correlationId: string,
): ValidatedCommand {
  assertExactKeys(payload, ["requestId"]);
  const requestId = uuid(payload.requestId);
  return {
    rpc: "sign_loan_contract",
    args: {
      p_client: userId,
      p_correlation_id: correlationId,
      p_idempotency_key: idempotencyKey,
      p_request: requestId,
    },
    fallbackId: requestId,
    fallbackStatus: "SIGNED",
  };
}

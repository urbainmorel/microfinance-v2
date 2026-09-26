import { assertExactKeys, enumValue, uuid } from "../validation.ts";
import type { JsonObject, ValidatedCommand } from "../types.ts";

export function handleCancel(
  payload: JsonObject,
  userId: string,
  idempotencyKey: string,
  correlationId: string,
): ValidatedCommand {
  assertExactKeys(payload, ["requestId", "requestType"]);
  const requestId = uuid(payload.requestId);
  return {
    rpc: "cancel_client_request",
    args: {
      p_client: userId,
      p_correlation_id: correlationId,
      p_idempotency_key: idempotencyKey,
      p_request: requestId,
      p_kind: enumValue(payload.requestType, [
        "deposit",
        "withdrawal",
        "loan",
        "repayment",
      ] as const),
    },
    fallbackId: requestId,
    fallbackStatus: "CANCELLED",
  };
}

import { CommandError } from "./errors.ts";
import { isObject, UUID_PATTERN } from "./validation.ts";
import type { ValidatedCommand } from "./types.ts";

export function commandResult(
  data: unknown,
  command: ValidatedCommand,
  correlationId: string,
): { id: string; status: string; correlationId: string } {
  const value = Array.isArray(data) ? data[0] : data;
  if (typeof value === "string" && UUID_PATTERN.test(value)) {
    return { id: value, status: command.fallbackStatus, correlationId };
  }
  if (isObject(value)) {
    const candidateId = value.id ?? value.request_id ?? value.loan_request_id;
    const id = typeof candidateId === "string" && UUID_PATTERN.test(candidateId)
      ? candidateId
      : command.fallbackId;
    const status = typeof value.status === "string" && value.status.length <= 64
      ? value.status
      : command.fallbackStatus;
    if (id) return { id, status, correlationId };
  }
  if (command.fallbackId) {
    return { id: command.fallbackId, status: command.fallbackStatus, correlationId };
  }
  throw new CommandError("INVALID_TRANSITION", 409, "Resultat RPC invalide");
}

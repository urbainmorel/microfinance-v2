import type { PostgrestError } from "npm:@supabase/supabase-js@2.112.3";
import { jsonResponse } from "../_shared/cors.ts";
import type { PublicErrorCode } from "./types.ts";

export class CommandError extends Error {
  constructor(
    readonly code: PublicErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CommandError";
  }
}

export function mapRpcError(error: PostgrestError): CommandError {
  const sqlCode = `${error.message} ${error.details ?? ""}`.toUpperCase();
  const text = `${error.code} ${error.message} ${error.details ?? ""}`.toLowerCase();

  if (error.code === "23505" || sqlCode.includes("ALREADY_PROCESSED")) {
    return new CommandError("ALREADY_PROCESSED", 409, "Operation deja traitee");
  }
  if (sqlCode.includes("GUARANTEE_REQUIRED")) {
    return new CommandError(
      "GUARANTEE_REQUIRED",
      409,
      "Le retrait du prêt exige la constitution préalable de la garantie.",
    );
  }
  if (sqlCode.includes("INSUFFICIENT_FUNDS")) {
    return new CommandError("INSUFFICIENT_FUNDS", 409, "Solde insuffisant");
  }
  if (sqlCode.includes("OUTSIDE_WINDOW")) {
    return new CommandError("OUTSIDE_WINDOW", 409, "Operation hors plage autorisee");
  }
  if (sqlCode.includes("ONLY_MOBILE_MONEY_ALLOWED")) {
    return new CommandError(
      "VALIDATION_ERROR",
      400,
      "Seul le dépôt par Mobile Money est autorisé pour cette opération.",
    );
  }
  if (
    error.code === "22023" ||
    [
      "VALIDATION_ERROR",
      "INVALID_AMOUNT",
      "INVALID_MOTIF",
      "INVALID_PAYMENT_METHOD",
      "INVALID_PROOF_PATH",
      "INVALID_DOCUMENT_PATH",
      "INVALID_WITHDRAWAL_TYPE",
      "RECIPIENT_NAME_REQUIRED",
      "REFERENCE_REQUIRED",
      "PURPOSE_REQUIRED",
      "AMOUNT_OUT_OF_RANGE",
      "DURATION_OUT_OF_RANGE",
      "PRODUCT_NOT_FOUND",
      "KYC_REQUIRED",
    ].some((code) => sqlCode.includes(code))
  ) {
    return new CommandError("VALIDATION_ERROR", 400, "Donnees invalides");
  }
  if (
    error.code === "42501" ||
    text.includes("non autoris") ||
    text.includes("permission") ||
    sqlCode.includes("FORBIDDEN")
  ) {
    return new CommandError("FORBIDDEN", 403, "Operation interdite");
  }
  if (sqlCode.includes("ACTIVE_LOAN_EXISTS")) {
    return new CommandError(
      "ACTIVE_LOAN_EXISTS",
      409,
      "Vous avez déjà un prêt actif ou une demande de prêt en cours de traitement.",
    );
  }
  if (
    error.code === "23514" ||
    sqlCode.includes("INVALID_TRANSITION") ||
    sqlCode.includes("OVERPAYMENT") ||
    sqlCode.includes("ACTIVE_LOAN_NOT_FOUND")
  ) {
    return new CommandError("INVALID_TRANSITION", 409, "Transition invalide");
  }
  return new CommandError("INVALID_TRANSITION", 409, "Operation impossible");
}

export function errorResponse(error: CommandError, correlationId?: string): Response {
  return jsonResponse(
    {
      error: error.code,
      message: error.message,
      ...(correlationId ? { correlationId } : {}),
    },
    error.status,
  );
}

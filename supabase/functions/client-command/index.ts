import type { PostgrestError } from "npm:@supabase/supabase-js@2.112.3";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { PinVerificationError, verifyPin } from "../_shared/pin.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIONS = [
  "deposit.create",
  "withdrawal.create",
  "request.cancel",
  "loan.submit",
  "loan.contract.sign",
  "guarantee.block",
  "repayment.create",
] as const;

type Action = (typeof ACTIONS)[number];
type RpcName =
  | "create_deposit_request"
  | "create_client_withdrawal"
  | "cancel_client_request"
  | "create_loan_request"
  | "sign_loan_contract"
  | "process_guarantee_blocking"
  | "create_repayment_request";

type PublicErrorCode =
  | "UNAUTHENTICATED"
  | "PIN_INVALID"
  | "PIN_LOCKED"
  | "PIN_NOT_CONFIGURED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "INVALID_TRANSITION"
  | "INSUFFICIENT_FUNDS"
  | "ALREADY_PROCESSED"
  | "OUTSIDE_WINDOW";

type JsonObject = Record<string, unknown>;
type ValidatedCommand = {
  rpc: RpcName;
  args: JsonObject;
  fallbackId?: string;
  fallbackStatus: string;
};

class CommandError extends Error {
  constructor(
    readonly code: PublicErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CommandError";
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: JsonObject,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    throw new CommandError("VALIDATION_ERROR", 400, "Champs invalides");
  }
}

function requiredString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    throw new CommandError("VALIDATION_ERROR", 400, "Texte invalide");
  }
  const result = value.trim();
  if (!result || result.length > maxLength) {
    throw new CommandError("VALIDATION_ERROR", 400, "Texte invalide");
  }
  return result;
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value, maxLength);
}

function positiveAmount(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new CommandError("VALIDATION_ERROR", 400, "Montant invalide");
  }
  return value as number;
}

function nonNegativeAmount(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new CommandError("VALIDATION_ERROR", 400, "Montant invalide");
  }
  return value as number;
}

function positiveInteger(value: unknown, maximum: number): number {
  if (!Number.isInteger(value) || (value as number) <= 0 || (value as number) > maximum) {
    throw new CommandError("VALIDATION_ERROR", 400, "Entier invalide");
  }
  return value as number;
}

function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new CommandError("VALIDATION_ERROR", 400, "UUID invalide");
  }
  return value.toLowerCase();
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new CommandError("VALIDATION_ERROR", 400, "Valeur invalide");
  }
  return value as T;
}

function proofPath(value: unknown): string {
  const path = requiredString(value, 512);
  if (
    path.startsWith("/") ||
    /^https?:\/\//i.test(path) ||
    path.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new CommandError("VALIDATION_ERROR", 400, "Chemin de preuve invalide");
  }
  return path;
}

function requiredElectronicReference(method: string, value: unknown): string | null {
  const reference = optionalString(value, 120);
  if (method !== "CASH" && !reference) {
    throw new CommandError("VALIDATION_ERROR", 400, "Reference requise");
  }
  return reference;
}

function ownedDocumentPaths(value: unknown, userId: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) {
    throw new CommandError("VALIDATION_ERROR", 400, "Documents invalides");
  }
  const paths = value.map((entry) => {
    const path = proofPath(entry);
    if (!path.startsWith(`${userId}/`)) {
      throw new CommandError("FORBIDDEN", 403, "Chemin de document interdit");
    }
    return path;
  });
  if (new Set(paths).size !== paths.length) {
    throw new CommandError("VALIDATION_ERROR", 400, "Documents invalides");
  }
  return paths;
}

function validatePayload(
  action: Action,
  payload: unknown,
  userId: string,
  idempotencyKey: string,
  correlationId: string,
): ValidatedCommand {
  if (!isObject(payload)) {
    throw new CommandError("VALIDATION_ERROR", 400, "Payload invalide");
  }

  const common = {
    p_client: userId,
    p_correlation_id: correlationId,
  };
  const idempotent = { ...common, p_idempotency_key: idempotencyKey };

  switch (action) {
    case "deposit.create": {
      assertExactKeys(payload, ["amount", "motif", "paymentMethod", "proofPath"], [
        "reference",
      ]);
      const paymentMethod = enumValue(payload.paymentMethod, [
        "CASH",
        "MOBILE_MONEY",
        "BANK_TRANSFER",
      ] as const);
      return {
        rpc: "create_deposit_request",
        args: {
          ...idempotent,
          p_amount: positiveAmount(payload.amount),
          p_motif: enumValue(payload.motif, ["FREE_SAVINGS", "GUARANTEE", "REPAYMENT"] as const),
          p_payment_method: paymentMethod,
          p_reference: requiredElectronicReference(paymentMethod, payload.reference),
          p_proof_path: proofPath(payload.proofPath),
        },
        fallbackStatus: "PENDING",
      };
    }

    case "withdrawal.create": {
      assertExactKeys(payload, ["type", "amount", "recipient"]);
      const type = enumValue(payload.type, ["MOBILE_MONEY", "BANK_TRANSFER"] as const);
      if (!isObject(payload.recipient)) {
        throw new CommandError("VALIDATION_ERROR", 400, "Destinataire invalide");
      }

      let recipient: JsonObject;
      if (type === "MOBILE_MONEY") {
        assertExactKeys(payload.recipient, ["operator", "phone", "name"]);
        const phone = requiredString(payload.recipient.phone, 24);
        if (!/^\+?[0-9][0-9 -]{6,22}$/.test(phone)) {
          throw new CommandError("VALIDATION_ERROR", 400, "Telephone invalide");
        }
        recipient = {
          operator: requiredString(payload.recipient.operator, 50),
          phone,
          name: requiredString(payload.recipient.name, 120),
        };
      } else {
        assertExactKeys(payload.recipient, [
          "bank",
          "bankCode",
          "account",
          "country",
          "iban",
          "motif",
          "name",
        ]);
        const country = enumValue(payload.recipient.country, [
          "BJ",
          "BF",
          "CI",
          "GW",
          "ML",
          "NE",
          "SN",
          "TG",
        ] as const);
        recipient = {
          bank: requiredString(payload.recipient.bank, 120),
          bankCode: requiredString(payload.recipient.bankCode, 32),
          account: requiredString(payload.recipient.account, 64),
          country,
          iban: optionalString(payload.recipient.iban, 64),
          motif: requiredString(payload.recipient.motif, 200),
          name: requiredString(payload.recipient.name, 120),
        };
      }

      return {
        rpc: "create_client_withdrawal",
        args: {
          ...idempotent,
          p_type: type,
          p_amount: positiveAmount(payload.amount),
          p_recipient: recipient,
        },
        fallbackStatus: "PENDING",
      };
    }

    case "request.cancel": {
      assertExactKeys(payload, ["requestId", "requestType"]);
      const requestId = uuid(payload.requestId);
      return {
        rpc: "cancel_client_request",
        args: {
          ...idempotent,
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

    case "loan.submit": {
      assertExactKeys(
        payload,
        ["productId", "amount", "durationMonths", "purpose", "disbursementMethod"],
        ["monthlyIncomeEstimate", "documentPaths"],
      );
      return {
        rpc: "create_loan_request",
        args: {
          ...idempotent,
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
        fallbackStatus: "SUBMITTED",
      };
    }

    case "loan.contract.sign": {
      assertExactKeys(payload, ["requestId"]);
      const requestId = uuid(payload.requestId);
      return {
        rpc: "sign_loan_contract",
        args: { ...idempotent, p_request: requestId },
        fallbackId: requestId,
        fallbackStatus: "SIGNED",
      };
    }

    case "guarantee.block": {
      assertExactKeys(payload, ["requestId"]);
      const requestId = uuid(payload.requestId);
      return {
        rpc: "process_guarantee_blocking",
        args: { ...idempotent, p_request: requestId },
        fallbackId: requestId,
        fallbackStatus: "GUARANTEE_PENDING",
      };
    }

    case "repayment.create": {
      assertExactKeys(payload, ["loanId", "amount", "paymentMethod", "proofPath"], [
        "reference",
      ]);
      const paymentMethod = enumValue(payload.paymentMethod, [
        "CASH",
        "MOBILE_MONEY",
        "BANK_TRANSFER",
      ] as const);
      return {
        rpc: "create_repayment_request",
        args: {
          ...idempotent,
          p_loan: uuid(payload.loanId),
          p_amount: positiveAmount(payload.amount),
          p_payment_method: paymentMethod,
          p_reference: requiredElectronicReference(paymentMethod, payload.reference),
          p_proof_path: proofPath(payload.proofPath),
        },
        fallbackStatus: "PENDING",
      };
    }
  }
}

function mapRpcError(error: PostgrestError): CommandError {
  const sqlCode = `${error.message} ${error.details ?? ""}`.toUpperCase();
  const text = `${error.code} ${error.message} ${error.details ?? ""}`.toLowerCase();

  if (error.code === "23505" || sqlCode.includes("ALREADY_PROCESSED")) {
    return new CommandError("ALREADY_PROCESSED", 409, "Operation deja traitee");
  }
  if (sqlCode.includes("INSUFFICIENT_FUNDS")) {
    return new CommandError("INSUFFICIENT_FUNDS", 409, "Solde insuffisant");
  }
  if (sqlCode.includes("OUTSIDE_WINDOW")) {
    return new CommandError("OUTSIDE_WINDOW", 409, "Operation hors plage autorisee");
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
  if (
    error.code === "23514" ||
    sqlCode.includes("INVALID_TRANSITION") ||
    sqlCode.includes("ACTIVE_LOAN_EXISTS") ||
    sqlCode.includes("OVERPAYMENT") ||
    sqlCode.includes("ACTIVE_LOAN_NOT_FOUND")
  ) {
    return new CommandError("INVALID_TRANSITION", 409, "Transition invalide");
  }
  return new CommandError("INVALID_TRANSITION", 409, "Operation impossible");
}

function commandResult(
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

function errorResponse(error: CommandError, correlationId?: string): Response {
  return jsonResponse(
    {
      error: error.code,
      message: error.message,
      ...(correlationId ? { correlationId } : {}),
    },
    error.status,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "VALIDATION_ERROR", message: "Methode non autorisee" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          Allow: "POST, OPTIONS",
        },
      },
    );
  }

  const userId = await getUserId(req);
  if (!userId) {
    return errorResponse(new CommandError("UNAUTHENTICATED", 401, "Non authentifie"));
  }

  const body = await req.json().catch(() => null);
  if (!isObject(body)) {
    return errorResponse(new CommandError("VALIDATION_ERROR", 400, "JSON invalide"));
  }

  try {
    assertExactKeys(body, ["action", "pin", "idempotencyKey", "payload"]);
    const action = enumValue(body.action, ACTIONS);
    const idempotencyKey = uuid(body.idempotencyKey);
    const admin = adminClient();

    await verifyPin(admin, userId, body.pin);

    const correlationId = crypto.randomUUID();
    const command = validatePayload(
      action,
      body.payload,
      userId,
      idempotencyKey,
      correlationId,
    );
    const { data, error } = await admin.rpc(command.rpc, command.args);

    if (error) throw mapRpcError(error);
    return jsonResponse(commandResult(data, command, correlationId));
  } catch (error) {
    if (error instanceof PinVerificationError) {
      return errorResponse(
        new CommandError(error.code, error.status, "Verification PIN refusee"),
      );
    }
    if (error instanceof CommandError) return errorResponse(error);
    return errorResponse(
      new CommandError("INVALID_TRANSITION", 500, "Operation impossible"),
    );
  }
});

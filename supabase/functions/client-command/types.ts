export const ACTIONS = [
  "deposit.create",
  "withdrawal.create",
  "request.cancel",
  "loan.submit",
  "loan.contract.sign",
  "guarantee.block",
  "repayment.create",
] as const;

export type Action = (typeof ACTIONS)[number];

export type RpcName =
  | "create_deposit_request"
  | "create_client_withdrawal"
  | "cancel_client_request"
  | "create_loan_request"
  | "sign_loan_contract"
  | "process_guarantee_blocking"
  | "create_repayment_request";

export type PublicErrorCode =
  | "UNAUTHENTICATED"
  | "PIN_INVALID"
  | "PIN_LOCKED"
  | "PIN_NOT_CONFIGURED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "INVALID_TRANSITION"
  | "ACTIVE_LOAN_EXISTS"
  | "INSUFFICIENT_FUNDS"
  | "ALREADY_PROCESSED"
  | "OUTSIDE_WINDOW"
  | "GUARANTEE_REQUIRED";

export type JsonObject = Record<string, unknown>;

export type ValidatedCommand = {
  rpc: RpcName;
  args: JsonObject;
  fallbackId?: string;
  fallbackStatus: string;
};

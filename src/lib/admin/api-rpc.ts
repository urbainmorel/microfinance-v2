import { callRpc } from "./api-client";

export function reviewKyc(clientId: string, action: string, reason: string | null): Promise<void> {
  return callRpc("review_kyc", { p_client: clientId, p_action: action, p_reason: reason });
}

export function verifyKycDocument(documentId: string, verified: boolean, reason: string | null) {
  return callRpc("verify_kyc_document", {
    p_document: documentId,
    p_verified: verified,
    p_reason: reason,
  });
}

export function confirmDeposit(requestId: string, action: string, reason: string | null) {
  return callRpc("confirm_deposit", { p_request: requestId, p_action: action, p_reason: reason });
}

export function settleWithdrawal(
  requestId: string,
  action: string,
  reference: string | null,
  reason: string | null,
) {
  return callRpc("settle_withdrawal", {
    p_request: requestId,
    p_action: action,
    p_reference: reference,
    p_reason: reason,
  });
}

export function confirmRepayment(requestId: string, action: string, reason: string | null) {
  return callRpc("confirm_repayment", { p_request: requestId, p_action: action, p_reason: reason });
}

export function transitionLoanRequest(
  requestId: string,
  action: string,
  approvedAmount: number | null,
  comment: string | null,
) {
  return callRpc("transition_loan_request", {
    p_request: requestId,
    p_action: action,
    p_approved_amount: approvedAmount,
    p_comment: comment,
  });
}

export function disburseLoan(requestId: string, externalReference: string) {
  return callRpc("disburse_loan", {
    p_request: requestId,
    p_external_reference: externalReference,
  });
}

export function manageUserStatus(userId: string, active: boolean) {
  return callRpc("manage_user_status", { p_user: userId, p_active: active });
}

export function processDataErasure(
  requestId: string,
  action: "REJECT" | "ANONYMIZE",
  reason: string,
) {
  return callRpc("process_data_erasure", {
    p_request: requestId,
    p_action: action,
    p_reason: reason.trim(),
  });
}

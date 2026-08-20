import {
  adminSupabase,
  createPrivateProofUrl,
  getClientMap,
  numberValue,
  optionalText,
  rows,
  textValue,
  type DbRecord,
} from "./api-client";

import type { DepositQueueItem, RepaymentQueueItem, WithdrawalQueueItem } from "./types";

async function financeRecords(table: string, select: string) {
  const { data, error } = await adminSupabase
    .from(table)
    .select(select)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const records = rows(data);
  const clients = await getClientMap(records.map((row) => textValue(row.client_id)));
  return { records, clients };
}

export async function getDepositQueue(): Promise<DepositQueueItem[]> {
  const { records, clients } = await financeRecords(
    "deposit_requests",
    "id, client_id, amount, motif, payment_method, reference, proof_url, status, created_at",
  );
  return Promise.all(
    records.map(async (row) => {
      const clientId = textValue(row.client_id);
      return {
        id: textValue(row.id),
        clientId,
        client: clients.get(clientId) ?? null,
        amount: numberValue(row.amount),
        motif: textValue(row.motif),
        paymentMethod: textValue(row.payment_method),
        reference: optionalText(row.reference),
        proofUrl: await createPrivateProofUrl("deposit-proofs", row.proof_url),
        status: textValue(row.status),
        createdAt: textValue(row.created_at),
      };
    }),
  );
}

function recipientDetail(row: DbRecord): string {
  const values =
    row.type === "MOBILE_MONEY"
      ? [row.recipient_operator, row.recipient_phone]
      : [row.recipient_bank, row.recipient_account];
  return values.map(textValue).filter(Boolean).join(" · ");
}

export async function getWithdrawalQueue(): Promise<WithdrawalQueueItem[]> {
  const { records, clients } = await financeRecords(
    "withdrawal_requests",
    "id, client_id, type, amount, recipient_operator, recipient_phone, recipient_bank, recipient_account, recipient_name, status, external_reference, created_at",
  );
  return records.map((row) => {
    const clientId = textValue(row.client_id);
    return {
      id: textValue(row.id),
      clientId,
      client: clients.get(clientId) ?? null,
      type: textValue(row.type),
      amount: numberValue(row.amount),
      recipientName: textValue(row.recipient_name),
      recipientDetail: recipientDetail(row),
      status: textValue(row.status),
      externalReference: optionalText(row.external_reference),
      createdAt: textValue(row.created_at),
    };
  });
}

export async function getRepaymentQueue(): Promise<RepaymentQueueItem[]> {
  const { records, clients } = await financeRecords(
    "repayment_requests",
    "id, loan_id, client_id, amount, payment_method, reference, proof_url, status, created_at",
  );
  return Promise.all(
    records.map(async (row) => {
      const clientId = textValue(row.client_id);
      return {
        id: textValue(row.id),
        loanId: textValue(row.loan_id),
        clientId,
        client: clients.get(clientId) ?? null,
        amount: numberValue(row.amount),
        paymentMethod: textValue(row.payment_method),
        reference: optionalText(row.reference),
        proofUrl: await createPrivateProofUrl("repayment-proofs", row.proof_url),
        status: textValue(row.status),
        createdAt: textValue(row.created_at),
      };
    }),
  );
}

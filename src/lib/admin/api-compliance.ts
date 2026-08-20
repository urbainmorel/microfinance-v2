import {
  adminSupabase,
  createPrivateProofUrl,
  getClientMap,
  mapClient,
  optionalNumber,
  optionalText,
  rows,
  textValue,
} from "./api-client";

import type { AuditItem, KycQueueItem } from "./types";

export async function getKycQueue(): Promise<KycQueueItem[]> {
  const [{ data, error }, documentsResult] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select(
        "id, firstname, lastname, phone, kyc_status, id_type, id_number, country, city, profession, monthly_income_estimate, created_at",
      )
      .neq("kyc_status", "NONE")
      .order("created_at", { ascending: false })
      .limit(100),
    adminSupabase.from("kyc_documents").select("client_id,doc_type,url"),
  ]);
  if (error) throw new Error(error.message);
  if (documentsResult.error) throw new Error(documentsResult.error.message);
  const signedDocuments = await Promise.all(
    rows(documentsResult.data).map(async (document) => ({
      clientId: textValue(document.client_id),
      type: textValue(document.doc_type),
      url: await createPrivateProofUrl("kyc-documents", document.url),
    })),
  );
  return rows(data).map((row) => ({
    ...mapClient(row),
    kycStatus: textValue(row.kyc_status),
    idType: optionalText(row.id_type),
    idNumber: optionalText(row.id_number),
    country: optionalText(row.country),
    city: optionalText(row.city),
    profession: optionalText(row.profession),
    monthlyIncomeEstimate: optionalNumber(row.monthly_income_estimate),
    createdAt: textValue(row.created_at),
    documents: signedDocuments
      .filter((document) => document.clientId === textValue(row.id) && document.url)
      .map((document) => ({ type: document.type, url: document.url as string })),
  }));
}

export async function getAuditQueue(): Promise<AuditItem[]> {
  const { data, error } = await adminSupabase
    .from("audit_logs")
    .select(
      "id, user_id, user_role, action_type, target_id, old_value, new_value, reason, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const records = rows(data);
  const clients = await getClientMap(records.map((row) => textValue(row.user_id)));
  return records.map((row) => ({
    id: textValue(row.id),
    actor: clients.get(textValue(row.user_id)) ?? null,
    userRole: textValue(row.user_role),
    actionType: textValue(row.action_type),
    targetId: optionalText(row.target_id),
    reason: optionalText(row.reason),
    oldValue: row.old_value,
    newValue: row.new_value,
    createdAt: textValue(row.created_at),
  }));
}

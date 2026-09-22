import {
  KYC_BUCKET,
  KYC_DOC_TYPES,
  kycDocumentSchema,
  normalizeFcfaCountry,
  type KycDocType,
  type KycField,
  type KycInput,
} from "@/lib/schemas/kyc";

import type { DatabaseClient, Json } from "@/lib/database.types";

function pick(values: KycInput, fields: readonly KycField[]): Json {
  const out: { [key: string]: Json | undefined } = {};
  for (const f of fields) {
    const v = values[f];
    if (v !== undefined && v !== "" && v !== null) out[f] = v;
  }
  return out;
}

/** Enregistre une étape via la RPC serveur adéquate (PRD §6.4, sauvegarde auto). */
export async function saveKycStep(
  supabase: DatabaseClient,
  target: "profile" | "financials",
  fields: readonly KycField[],
  values: KycInput,
): Promise<void> {
  const p_data = pick(values, fields);
  const rpc = target === "profile" ? "save_kyc_profile" : "save_kyc_financials";
  const { error } = await supabase.rpc(rpc, { p_data });
  if (error) throw error;
}

/** Téléverse une pièce dans le bucket privé puis enregistre sa métadonnée (upsert idempotent). */
export async function uploadKycDocument(
  supabase: DatabaseClient,
  docType: KycDocType,
  file: File,
): Promise<void> {
  const parsed = kycDocumentSchema.safeParse(file);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Fichier invalide");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Chemin déterministe `<uid>/<docType>` : premier segment = uid (RLS own-folder).
  const path = `${user.id}/${docType}`;
  const { error: uploadError } = await supabase.storage
    .from(KYC_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { error: rowError } = await supabase.rpc("finalize_kyc_document", {
    p_doc_type: docType,
    p_path: path,
  });
  if (rowError) throw rowError;
}

/** Recharge les données KYC existantes pour reprendre le wizard (PRD §6.4). */
export async function loadKyc(supabase: DatabaseClient): Promise<Partial<KycInput>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "birth_date, country, city, address, phone, profession, monthly_income_estimate, id_type, id_number, id_expiry",
    )
    .eq("id", user.id)
    .single();
  const { data: financials } = await supabase
    .from("kyc_financials")
    .select("income_source, monthly_charges, momo_operator, momo_number, usual_bank")
    .eq("client_id", user.id)
    .maybeSingle();
  const country = normalizeFcfaCountry(profile?.country);
  return {
    ...(profile ?? {}),
    ...(country ? { country } : {}),
    ...(financials ?? {}),
  } as Partial<KycInput>;
}

/** Liste les types de pièces déjà téléversées, pour restaurer l'état du wizard. */
export async function loadKycDocuments(supabase: DatabaseClient): Promise<KycDocType[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("kyc_documents").select("doc_type").eq("client_id", user.id);
  return (data ?? [])
    .map((r) => r.doc_type)
    .filter((d): d is KycDocType => (KYC_DOC_TYPES as readonly string[]).includes(d));
}

import type { KycDocRow, SignedDocUrls } from "./types";
import type { Json } from "@/lib/database.types";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PrepareDocumentsResult =
  | { success: true; urls: SignedDocUrls }
  | {
      success: false;
      statusCode: number;
      responsePayload: { error: string } | { success: boolean; status: string; reason: string };
    };

export function findRequiredDocs(documents: KycDocRow[], requiresBack: boolean) {
  const front = documents.find((d) => d.doc_type === "ID_FRONT");
  const back = documents.find((d) => d.doc_type === "ID_BACK");

  if (!front || (requiresBack && !back)) {
    return null;
  }
  return { front, back };
}

export async function getSignedUrl(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const res = await adminClient.storage.from("kyc-documents").createSignedUrl(path, 120);
  return res.data ? res.data.signedUrl : null;
}

export async function resolveSignedUrls(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  frontPath: string,
  backPath: string | null,
): Promise<SignedDocUrls | null> {
  const [frontUrl, backUrl] = await Promise.all([
    getSignedUrl(adminClient, frontPath),
    getSignedUrl(adminClient, backPath),
  ]);

  if (!frontUrl) return null;
  if (backPath && !backUrl) return null;

  return { frontUrl, backUrl };
}

export async function prepareDocuments(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  idType: string | null,
): Promise<PrepareDocumentsResult> {
  const { data: documents, error } = await adminClient
    .from("kyc_documents")
    .select("id, doc_type, url")
    .eq("client_id", userId);

  if (error || !documents) {
    return {
      success: false,
      statusCode: 500,
      responsePayload: { error: "Impossible de récupérer les pièces du dossier" },
    };
  }

  const requiresBack = idType !== "PASSPORT";
  const docs = findRequiredDocs(documents, requiresBack);
  if (!docs) {
    const reason = "Dossier incomplet : le recto et le verso (si requis) doivent être fournis.";
    await adminClient.rpc("auto_process_kyc", {
      p_client_id: userId,
      p_decision: "REJECT",
      p_reason: reason,
      p_report: { missing_docs: true } as unknown as Json,
    });
    return {
      success: false,
      statusCode: 200,
      responsePayload: { success: false, status: "REJECTED", reason },
    };
  }

  const urls = await resolveSignedUrls(
    adminClient,
    docs.front.url || `${userId}/ID_FRONT`,
    requiresBack ? docs.back?.url || `${userId}/ID_BACK` : null,
  );

  if (!urls) {
    return {
      success: false,
      statusCode: 500,
      responsePayload: { error: "Erreur lors de la préparation sécurisée des justificatifs" },
    };
  }

  return { success: true, urls };
}

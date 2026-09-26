import type { KycQueueItem } from "@/lib/admin/types";

export function isKycComplete(item: KycQueueItem): boolean {
  const types = new Set(
    item.documents.filter((document) => document.verified).map((document) => document.type),
  );
  return types.has("ID_FRONT") && (item.idType === "PASSPORT" || types.has("ID_BACK"));
}

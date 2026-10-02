import { STORAGE_QUOTA_BYTES } from "./storage-utils";

export interface StorageBucketStat {
  bucketId: string;
  bytes: number;
  files: number;
}

export interface StorageStats {
  totalBytes: number;
  totalFiles: number;
  quotaBytes: number;
  remainingBytes: number;
  usedPercentage: number;
  matchingFiles: number;
  matchingBytes: number;
  buckets: StorageBucketStat[];
}

export interface PurgeResult {
  deletedCount: number;
  freedBytes: number;
  remainingBytes: number;
  usedPercentage: number;
}

function parseNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildStorageQuery(options?: { startDate?: string; endDate?: string }): string {
  if (!options) return "";
  const params = new URLSearchParams();
  if (options.startDate) params.set("startDate", options.startDate);
  if (options.endDate) params.set("endDate", options.endDate);
  const q = params.toString();
  return q ? `?${q}` : "";
}

/**
 * Récupère les métriques globales de stockage et l'estimation pour la plage de dates si fournie.
 */
export async function getStorageStats(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<StorageStats> {
  const url = `/api/admin/storage${buildStorageQuery(options)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error || "Impossible de récupérer les statistiques d'espace de stockage.",
    );
  }

  const data = await res.json();
  return {
    totalBytes: parseNumber(data.totalBytes),
    totalFiles: parseNumber(data.totalFiles),
    quotaBytes: parseNumber(data.quotaBytes, STORAGE_QUOTA_BYTES),
    remainingBytes: parseNumber(data.remainingBytes),
    usedPercentage: parseNumber(data.usedPercentage),
    matchingFiles: parseNumber(data.matchingFiles),
    matchingBytes: parseNumber(data.matchingBytes),
    buckets: Array.isArray(data.buckets) ? data.buckets : [],
  };
}

/**
 * Déclenche la purge des fichiers situés dans la plage de dates spécifiée.
 */
export async function purgeStorageRange(startDate: string, endDate: string): Promise<PurgeResult> {
  const res = await fetch("/api/admin/storage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ startDate, endDate }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Erreur lors de la suppression des fichiers de stockage.");
  }

  const data = await res.json();
  return {
    deletedCount: parseNumber(data.deletedCount),
    freedBytes: parseNumber(data.freedBytes),
    remainingBytes: parseNumber(data.remainingBytes),
    usedPercentage: parseNumber(data.usedPercentage),
  };
}

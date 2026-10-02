export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 Go = 1,073,741,824 octets

export type StorageUsageLevel = "normal" | "warning" | "critical";

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  usedPercentage: number;
  level: StorageUsageLevel;
}

/**
 * Formate un nombre d'octets en chaîne lisible (o, Ko, Mo, Go).
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 Mo";
  }

  if (bytes < 1024) {
    return `${bytes} o`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} Ko`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1)} Mo`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(2)} Go`;
}

/**
 * Calcule l'utilisation, le reste et le niveau d'alerte pour le quota de stockage.
 */
export function calculateStorageUsage(
  totalBytes: number,
  quotaBytes = STORAGE_QUOTA_BYTES,
): StorageUsage {
  const safeTotal = Math.max(0, Number.isFinite(totalBytes) ? totalBytes : 0);
  const safeQuota = Math.max(1, Number.isFinite(quotaBytes) ? quotaBytes : STORAGE_QUOTA_BYTES);
  const remainingBytes = Math.max(0, safeQuota - safeTotal);
  const usedPercentage = Math.min(
    100,
    Math.max(0, Number(((safeTotal / safeQuota) * 100).toFixed(1))),
  );

  let level: StorageUsageLevel = "normal";
  if (usedPercentage >= 90) {
    level = "critical";
  } else if (usedPercentage >= 70) {
    level = "warning";
  }

  return {
    usedBytes: safeTotal,
    quotaBytes: safeQuota,
    remainingBytes,
    usedPercentage,
    level,
  };
}

export interface DateRangeValidation {
  valid: boolean;
  error?: string;
  startIso?: string;
  endIso?: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valide une plage de dates au format YYYY-MM-DD et retourne les bornes ISO.
 */
export function validateDateRange(startDate: string, endDate: string): DateRangeValidation {
  if (!startDate || !startDate.trim()) {
    return { valid: false, error: "La date de début est requise." };
  }
  if (!endDate || !endDate.trim()) {
    return { valid: false, error: "La date de fin est requise." };
  }

  const trimmedStart = startDate.trim();
  const trimmedEnd = endDate.trim();

  if (!DATE_REGEX.test(trimmedStart)) {
    return { valid: false, error: "Format de date de début invalide (AAAA-MM-JJ attendu)." };
  }
  if (!DATE_REGEX.test(trimmedEnd)) {
    return { valid: false, error: "Format de date de fin invalide (AAAA-MM-JJ attendu)." };
  }

  const startTimestamp = Date.parse(`${trimmedStart}T00:00:00.000Z`);
  const endTimestamp = Date.parse(`${trimmedEnd}T23:59:59.999Z`);

  if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) {
    return { valid: false, error: "Dates non valides." };
  }

  if (trimmedStart > trimmedEnd) {
    return {
      valid: false,
      error: "La date de fin doit être postérieure ou égale à la date de début.",
    };
  }

  return {
    valid: true,
    startIso: `${trimmedStart}T00:00:00.000Z`,
    endIso: `${trimmedEnd}T23:59:59.999Z`,
  };
}

/**
 * Découpe un tableau en sous-tableaux de taille maximale définie (lots / batches).
 */
export function chunkArray<T>(items: T[], size = 150): T[][] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const safeSize = Math.max(1, Math.floor(size));
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += safeSize) {
    chunks.push(items.slice(i, i + safeSize));
  }
  return chunks;
}

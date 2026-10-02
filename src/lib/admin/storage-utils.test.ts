import { describe, expect, it } from "vitest";

import {
  calculateStorageUsage,
  chunkArray,
  formatBytes,
  STORAGE_QUOTA_BYTES,
  validateDateRange,
} from "./storage-utils";

describe("storage-utils: formatBytes & usage", () => {
  it("gère les cas nuls, négatifs ou non finis pour formatBytes", () => {
    expect(formatBytes(0)).toBe("0 Mo");
    expect(formatBytes(-100)).toBe("0 Mo");
    expect(formatBytes(NaN)).toBe("0 Mo");
  });

  it("formate correctement les octets, Ko, Mo et Go", () => {
    expect(formatBytes(500)).toBe("500 o");
    expect(formatBytes(1024)).toBe("1.0 Ko");
    expect(formatBytes(1536)).toBe("1.5 Ko");
    expect(formatBytes(1024 * 1024)).toBe("1.0 Mo");
    expect(formatBytes(500 * 1024 * 1024)).toBe("500.0 Mo");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 Go");
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe("1.50 Go");
  });

  it("calcule correctement pour une utilisation faible (normal)", () => {
    const bytes = 200 * 1024 * 1024; // 200 Mo
    const usage = calculateStorageUsage(bytes);

    expect(usage.usedBytes).toBe(bytes);
    expect(usage.quotaBytes).toBe(STORAGE_QUOTA_BYTES);
    expect(usage.remainingBytes).toBe(STORAGE_QUOTA_BYTES - bytes);
    expect(usage.usedPercentage).toBe(19.5);
    expect(usage.level).toBe("normal");
  });

  it("détecte le niveau d'alerte (warning) entre 70% et 90%", () => {
    const bytes = Math.round(0.75 * STORAGE_QUOTA_BYTES);
    const usage = calculateStorageUsage(bytes);

    expect(usage.usedPercentage).toBe(75);
    expect(usage.level).toBe("warning");
  });

  it("détecte le niveau critique (critical) au-dessus de 90%", () => {
    const bytes = Math.round(0.95 * STORAGE_QUOTA_BYTES);
    const usage = calculateStorageUsage(bytes);

    expect(usage.usedPercentage).toBe(95);
    expect(usage.level).toBe("critical");
  });

  it("ne dépasse pas 100% et n'a pas de reste négatif en cas de saturation", () => {
    const bytes = STORAGE_QUOTA_BYTES + 5000000;
    const usage = calculateStorageUsage(bytes);

    expect(usage.remainingBytes).toBe(0);
    expect(usage.usedPercentage).toBe(100);
    expect(usage.level).toBe("critical");
  });
});

describe("storage-utils: validateDateRange & chunkArray", () => {
  it("rejette les dates vides ou formats invalides", () => {
    expect(validateDateRange("", "2026-10-01").valid).toBe(false);
    expect(validateDateRange("2026-10-01", "").valid).toBe(false);
    expect(validateDateRange("01/10/2026", "2026-10-02").valid).toBe(false);
  });

  it("rejette si la date de fin est antérieure à la date de début", () => {
    const res = validateDateRange("2026-10-10", "2026-10-05");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("postérieure ou égale");
  });

  it("valide et produit les dates ISO quand la plage est correcte", () => {
    const res = validateDateRange("2026-01-01", "2026-03-31");
    expect(res.valid).toBe(true);
    expect(res.startIso).toBe("2026-01-01T00:00:00.000Z");
    expect(res.endIso).toBe("2026-03-31T23:59:59.999Z");
  });

  it("accepte un seul jour (date début == date fin)", () => {
    const res = validateDateRange("2026-05-15", "2026-05-15");
    expect(res.valid).toBe(true);
  });

  it("découpe un tableau en lots de la taille souhaitée", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const chunks = chunkArray(items, 3);
    expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it("gère les tableaux vides et découpage par défaut (150)", () => {
    expect(chunkArray([])).toEqual([]);
    const arr = Array.from({ length: 350 }, (_, i) => i);
    const chunks = chunkArray(arr);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(150);
    expect(chunks[1]).toHaveLength(150);
    expect(chunks[2]).toHaveLength(50);
  });
});

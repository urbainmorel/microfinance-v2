import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StorageCleaner } from "@/components/admin/storage-cleaner";
import { STORAGE_QUOTA_BYTES } from "@/lib/admin/storage-utils";

describe("StorageCleaner UI component", () => {
  it("affiche correctement la jauge avec des statistiques normales (< 70%)", () => {
    const mockStats = {
      totalBytes: 250 * 1024 * 1024, // 250 Mo
      totalFiles: 42,
      quotaBytes: STORAGE_QUOTA_BYTES,
      remainingBytes: STORAGE_QUOTA_BYTES - 250 * 1024 * 1024,
      usedPercentage: 24.4,
      matchingFiles: 0,
      matchingBytes: 0,
      buckets: [
        { bucketId: "kyc-documents", bytes: 150 * 1024 * 1024, files: 20 },
        { bucketId: "deposit-proofs", bytes: 100 * 1024 * 1024, files: 22 },
      ],
    };

    const html = renderToStaticMarkup(<StorageCleaner initialStats={mockStats} />);

    // Titres et libellés
    expect(html).toContain("Espace de stockage Supabase (Quota 1 Go)");
    expect(html).toContain("Espace utilisé");
    expect(html).toContain("250.0 Mo");
    expect(html).toContain("sur 1.00 Go (24.4%)");
    expect(html).toContain("Espace restant");
    expect(html).toContain("Fichiers en ligne");
    expect(html).toContain("42");

    // Barre de progression
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="24.4"');
    expect(html).toContain("bg-emerald-500");

    // Formulaire de dates
    expect(html).toContain("Date de début");
    expect(html).toContain("Date de fin");
    expect(html).toContain('id="storage-start-date"');
    expect(html).toContain('id="storage-end-date"');

    // Bouton de suppression désactivé tant qu'aucune plage n'est sélectionnée
    expect(html).toContain("Supprimer les fichiers de cette période");
    expect(html).toContain("disabled");
  });

  it("affiche l'alerte d'avertissement quand le stockage dépasse 70%", () => {
    const mockStats = {
      totalBytes: 800 * 1024 * 1024, // 800 Mo
      totalFiles: 120,
      quotaBytes: STORAGE_QUOTA_BYTES,
      remainingBytes: STORAGE_QUOTA_BYTES - 800 * 1024 * 1024,
      usedPercentage: 78.1,
      matchingFiles: 0,
      matchingBytes: 0,
      buckets: [],
    };

    const html = renderToStaticMarkup(<StorageCleaner initialStats={mockStats} />);

    expect(html).toContain("Attention : vous approchez de la limite des 1 Go (&gt; 70%).");
    expect(html).toContain("bg-amber-500");
  });

  it("affiche l'alerte critique quand le stockage dépasse 90%", () => {
    const mockStats = {
      totalBytes: 980 * 1024 * 1024, // 980 Mo (~95.7%)
      totalFiles: 350,
      quotaBytes: STORAGE_QUOTA_BYTES,
      remainingBytes: STORAGE_QUOTA_BYTES - 980 * 1024 * 1024,
      usedPercentage: 95.7,
      matchingFiles: 0,
      matchingBytes: 0,
      buckets: [],
    };

    const html = renderToStaticMarkup(<StorageCleaner initialStats={mockStats} />);

    expect(html).toContain("Alerte critique : stockage presque saturé (&gt; 90%).");
    expect(html).toContain("bg-rose-500");
    expect(html).toContain("text-rose-600");
  });
});

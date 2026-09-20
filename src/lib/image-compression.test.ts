import { describe, expect, it } from "vitest";

import { calculateDimensions, compressImageFile } from "@/lib/image-compression";

describe("compressImageFile", () => {
  it("laisse intact les fichiers PDF sans tenter de compression canvas", async () => {
    const pdfFile = new File(["dummy pdf content"], "document.pdf", {
      type: "application/pdf",
    });

    const result = await compressImageFile(pdfFile);
    expect(result).toBe(pdfFile);
    expect(result.name).toBe("document.pdf");
    expect(result.type).toBe("application/pdf");
  });

  describe("calculateDimensions", () => {
    it("ne redimensionne pas les images déjà inférieures à la taille max", () => {
      const { width, height } = calculateDimensions(1200, 800, 1600);
      expect(width).toBe(1200);
      expect(height).toBe(800);
    });

    it("réduit proportionnellement les photos paysage très haute résolution (ex: smartphone 4000x3000)", () => {
      const { width, height } = calculateDimensions(4000, 3000, 1600);
      expect(width).toBe(1600);
      expect(height).toBe(1200);
    });

    it("réduit proportionnellement les photos portrait (ex: selfie smartphone 3000x4000)", () => {
      const { width, height } = calculateDimensions(3000, 4000, 1600);
      expect(width).toBe(1200);
      expect(height).toBe(1600);
    });
  });
});

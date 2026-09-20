import { describe, expect, it } from "vitest";

import {
  formatDurationDisplay,
  getAmountStepForProduct,
  getDynamicDurationBounds,
  getQuickAmountOptions,
  getTiersForProduct,
  LOAN_TIERS_PRODUCT_1,
  LOAN_TIERS_PRODUCT_2,
  validateAmountStep,
} from "@/lib/loans/loan-tier-rules";

import type { LoanProduct } from "@/lib/schemas/loan";

const mockProduct1: LoanProduct = {
  id: "3e7cdbeb-ac64-46da-8906-3dc8cce47fd9",
  name: "Prêt Essentiel",
  description: "Financement court terme",
  min_amount: 100_000,
  max_amount: 500_000,
  min_duration_months: 6,
  max_duration_months: 12,
  interest_rate: 12.0,
  interest_method: "CONSTANT_INSTALLMENT",
  processing_fee_percent: 0,
  processing_fee_flat: 0,
  management_fee_percent: 0,
  management_fee_flat: 0,
  insurance_rate: 0,
  guarantee_rate: 10,
  mandatory_savings_rate: 5,
};

const mockProduct2: LoanProduct = {
  id: "2db60d8d-349e-423f-a5d0-b918ff4314bb",
  name: "Prêt Croissance",
  description: "Financement moyen terme",
  min_amount: 1_000_000,
  max_amount: 5_000_000,
  min_duration_months: 12,
  max_duration_months: 60,
  interest_rate: 15.0,
  interest_method: "CONSTANT_INSTALLMENT",
  processing_fee_percent: 0,
  processing_fee_flat: 0,
  management_fee_percent: 0,
  management_fee_flat: 0,
  insurance_rate: 0,
  guarantee_rate: 10,
  mandatory_savings_rate: 5,
};

describe("loan-tier-rules - tiers and bounds", () => {
  describe("getTiersForProduct", () => {
    it("identifie correctement les paliers pour le Produit 1", () => {
      expect(getTiersForProduct(mockProduct1)).toEqual(LOAN_TIERS_PRODUCT_1);
    });

    it("identifie correctement les paliers pour le Produit 2", () => {
      expect(getTiersForProduct(mockProduct2)).toEqual(LOAN_TIERS_PRODUCT_2);
    });
  });

  describe("getDynamicDurationBounds - Produit 1 (100k - 500k)", () => {
    it("applique 6 à 8 mois pour la tranche 100k à 200k", () => {
      const bounds100k = getDynamicDurationBounds(mockProduct1, 100_000);
      expect(bounds100k.minDuration).toBe(6);
      expect(bounds100k.maxDuration).toBe(8);
      expect(bounds100k.allowedDurations).toEqual([6, 7, 8]);

      const bounds200k = getDynamicDurationBounds(mockProduct1, 200_000);
      expect(bounds200k.minDuration).toBe(6);
      expect(bounds200k.maxDuration).toBe(8);
    });

    it("applique 6 à 10 mois pour la tranche 200 001 à 350k", () => {
      const bounds = getDynamicDurationBounds(mockProduct1, 250_000);
      expect(bounds.minDuration).toBe(6);
      expect(bounds.maxDuration).toBe(10);
      expect(bounds.allowedDurations).toEqual([6, 7, 8, 9, 10]);
    });

    it("applique 8 à 12 mois pour la tranche 350 001 à 500k", () => {
      const bounds = getDynamicDurationBounds(mockProduct1, 450_000);
      expect(bounds.minDuration).toBe(8);
      expect(bounds.maxDuration).toBe(12);
      expect(bounds.allowedDurations).toEqual([8, 9, 10, 11, 12]);
    });
  });

  describe("getDynamicDurationBounds - Produit 2 (1M - 5M)", () => {
    it("applique 12 à 24 mois pour la tranche 1M à 2M", () => {
      const bounds = getDynamicDurationBounds(mockProduct2, 1_500_000);
      expect(bounds.minDuration).toBe(12);
      expect(bounds.maxDuration).toBe(24);
      expect(bounds.allowedDurations).toContain(12);
      expect(bounds.allowedDurations).toContain(18);
      expect(bounds.allowedDurations).toContain(24);
    });

    it("applique 24 à 36 mois pour la tranche 2M à 3.5M", () => {
      const bounds = getDynamicDurationBounds(mockProduct2, 3_000_000);
      expect(bounds.minDuration).toBe(24);
      expect(bounds.maxDuration).toBe(36);
      expect(bounds.allowedDurations).toContain(24);
      expect(bounds.allowedDurations).toContain(30);
      expect(bounds.allowedDurations).toContain(36);
    });

    it("applique 36 à 60 mois pour la tranche 3.5M à 5M", () => {
      const bounds = getDynamicDurationBounds(mockProduct2, 5_000_000);
      expect(bounds.minDuration).toBe(36);
      expect(bounds.maxDuration).toBe(60);
      expect(bounds.allowedDurations).toContain(36);
      expect(bounds.allowedDurations).toContain(48);
      expect(bounds.allowedDurations).toContain(60);
    });
  });
});

describe("loan-tier-rules - steps and formatting", () => {
  describe("getAmountStepForProduct & getQuickAmountOptions", () => {
    it("définit un pas de 50 000 FCFA pour le Produit 1", () => {
      expect(getAmountStepForProduct(mockProduct1)).toBe(50_000);
      const options = getQuickAmountOptions(mockProduct1);
      expect(options).toEqual([
        100_000, 150_000, 200_000, 250_000, 300_000, 350_000, 400_000, 450_000, 500_000,
      ]);
    });

    it("définit un pas de 500 000 FCFA pour le Produit 2", () => {
      expect(getAmountStepForProduct(mockProduct2)).toBe(500_000);
      const options = getQuickAmountOptions(mockProduct2);
      expect(options).toEqual([
        1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000, 3_500_000, 4_000_000, 4_500_000,
        5_000_000,
      ]);
    });
  });

  describe("validateAmountStep", () => {
    it("valide les multiples de 50 000 pour le Produit 1 et rejette les montants intermédiaires", () => {
      expect(validateAmountStep(mockProduct1, 150_000)).toBeNull();
      expect(validateAmountStep(mockProduct1, 200_000)).toBeNull();
      expect(validateAmountStep(mockProduct1, 125_000)).toContain("multiple de 50");
    });

    it("valide les multiples de 500 000 pour le Produit 2 et rejette les montants non conformes", () => {
      expect(validateAmountStep(mockProduct2, 1_500_000)).toBeNull();
      expect(validateAmountStep(mockProduct2, 3_000_000)).toBeNull();
      expect(validateAmountStep(mockProduct2, 1_200_000)).toContain("multiple de 500");
    });
  });

  describe("formatDurationDisplay", () => {
    it("formate correctement les mois et les années", () => {
      expect(formatDurationDisplay(6)).toBe("6 mois");
      expect(formatDurationDisplay(12)).toBe("12 mois (1 an)");
      expect(formatDurationDisplay(24)).toBe("24 mois (2 ans)");
      expect(formatDurationDisplay(36)).toBe("36 mois (3 ans)");
      expect(formatDurationDisplay(60)).toBe("60 mois (5 ans)");
    });
  });
});

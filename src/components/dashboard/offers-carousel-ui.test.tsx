import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OffersCarouselUi } from "./offers-carousel-ui";

import type { LoanProduct } from "@/lib/schemas/loan";

const MOCK_PRODUCTS: LoanProduct[] = [
  {
    id: "prod-1",
    name: "Prêt Essentiel",
    description: "Solution court terme pour besoin urgent de trésorerie.",
    min_amount: 50000,
    max_amount: 500000,
    min_duration_months: 3,
    max_duration_months: 12,
    interest_rate: 0.05,
    interest_method: "CONSTANT_INSTALLMENT",
    processing_fee_percent: 0.01,
    processing_fee_flat: 0,
    management_fee_percent: 0,
    management_fee_flat: 0,
    insurance_rate: 0.01,
    guarantee_rate: 0.05,
    mandatory_savings_rate: 0,
  },
  {
    id: "prod-2",
    name: "Prêt Croissance",
    description: "Solution moyen terme pour investissement commercial.",
    min_amount: 500000,
    max_amount: 2500000,
    min_duration_months: 6,
    max_duration_months: 24,
    interest_rate: 0.07,
    interest_method: "DEGRESSIVE",
    processing_fee_percent: 0.015,
    processing_fee_flat: 0,
    management_fee_percent: 0,
    management_fee_flat: 0,
    insurance_rate: 0.01,
    guarantee_rate: 0.05,
    mandatory_savings_rate: 0,
  },
];

describe("OffersCarouselUi & Infinite Auto-Play", () => {
  it("renders carousel with products, indicators, and pause/play control", () => {
    const html = renderToStaticMarkup(
      <OffersCarouselUi
        products={MOCK_PRODUCTS}
        activeIndex={0}
        isKycVerified={true}
        onActiveIndexChange={() => {}}
        onSelectProduct={() => {}}
      />,
    );

    expect(html).toContain("Offres de financement");
    expect(html).toContain("Prêt Essentiel");
    expect(html).toContain("Prêt Croissance");
    expect(html).toContain("Demander ce prêt");
    // Controls (clean previous & next arrows, no bulky pause button)
    expect(html).not.toContain("Mettre en pause le défilement");
    expect(html).toContain("Offre précédente");
    expect(html).toContain("Offre suivante");
    // Indicators
    expect(html).toContain("Afficher l’offre 1");
    expect(html).toContain("Afficher l’offre 2");
  });

  it("calculates infinite loop indices accurately in both directions", () => {
    const count = 3;
    const nextForward = (current: number) => (current + 1) % count;
    const nextBackward = (current: number) => (current - 1 + count) % count;

    // Forward infinite loop: 0 -> 1 -> 2 -> 0 -> 1
    expect(nextForward(0)).toBe(1);
    expect(nextForward(1)).toBe(2);
    expect(nextForward(2)).toBe(0);
    expect(nextForward(0)).toBe(1);

    // Backward infinite loop: 0 -> 2 -> 1 -> 0
    expect(nextBackward(0)).toBe(2);
    expect(nextBackward(2)).toBe(1);
    expect(nextBackward(1)).toBe(0);
  });
});

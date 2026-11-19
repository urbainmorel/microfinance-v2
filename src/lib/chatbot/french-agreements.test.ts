import { describe, expect, it } from "vitest";

import { fixCommonFrenchAgreements } from "./rag-service";

describe("fixCommonFrenchAgreements", () => {
  it("corrige « vous + nom » en « votre + nom »", () => {
    expect(fixCommonFrenchAgreements("vous éligibilité correspond")).toBe(
      "votre éligibilité correspond",
    );
    expect(fixCommonFrenchAgreements("Vous demande est incomplète.")).toBe(
      "Votre demande est incomplète.",
    );
  });

  it("ne touche pas aux verbes conjugués avec vous", () => {
    expect(fixCommonFrenchAgreements("vous demandez un prêt")).toBe("vous demandez un prêt");
    expect(fixCommonFrenchAgreements("vous comptez rembourser")).toBe("vous comptez rembourser");
  });
});

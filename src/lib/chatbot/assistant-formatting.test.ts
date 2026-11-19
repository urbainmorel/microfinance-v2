import { describe, expect, it } from "vitest";

import { sanitizeAssistantFormatting } from "./rag-service";

describe("sanitizeAssistantFormatting", () => {
  it("retire le gras, les titres et le code inline", () => {
    const raw = "**Prêt Essentiel**\n## Conditions\nLe taux est `5 %`.";
    expect(sanitizeAssistantFormatting(raw)).toBe("Prêt Essentiel\nConditions\nLe taux est 5 %.");
  });

  it("laisse un texte naturel intact", () => {
    const text =
      "Le taux annuel du Prêt Essentiel est de 8,5 %.\n\nLe dépôt de garantie est de 10 %.";
    expect(sanitizeAssistantFormatting(text)).toBe(text);
  });
});

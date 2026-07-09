import { describe, expect, it } from "vitest";

import { formatFcfa, formatFcfaSigned } from "./format";

const NBSP = " ";

describe("formatFcfa", () => {
  it("groupe les milliers avec une espace insécable et suffixe FCFA", () => {
    expect(formatFcfa(95000)).toBe(`95${NBSP}000${NBSP}FCFA`);
    expect(formatFcfa(140000)).toBe(`140${NBSP}000${NBSP}FCFA`);
    expect(formatFcfa(1000000)).toBe(`1${NBSP}000${NBSP}000${NBSP}FCFA`);
    expect(formatFcfa(500)).toBe(`500${NBSP}FCFA`);
    expect(formatFcfa(0)).toBe(`0${NBSP}FCFA`);
  });

  it("tronque les décimales (FCFA entier, PRD §2.3)", () => {
    expect(formatFcfa(95000.9)).toBe(`95${NBSP}000${NBSP}FCFA`);
  });

  it("gère les montants négatifs sans rouge (signe textuel)", () => {
    expect(formatFcfa(-30000)).toBe(`-30${NBSP}000${NBSP}FCFA`);
  });

  it("rejette les valeurs non finies", () => {
    expect(() => formatFcfa(Number.NaN)).toThrow();
    expect(() => formatFcfa(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("formatFcfaSigned", () => {
  it("préfixe + pour les montants entrants et - pour les sortants", () => {
    expect(formatFcfaSigned(25000)).toBe(`+${NBSP}25${NBSP}000${NBSP}FCFA`);
    expect(formatFcfaSigned(-25000)).toBe(`-${NBSP}25${NBSP}000${NBSP}FCFA`);
    expect(formatFcfaSigned(0)).toBe(`0${NBSP}FCFA`);
  });
});

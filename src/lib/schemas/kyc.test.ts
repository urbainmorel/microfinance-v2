import { describe, expect, it } from "vitest";

import {
  FCFA_COUNTRIES,
  FCFA_COUNTRY_CODES,
  KYC_DOC_TYPES,
  KYC_STEPS,
  kycSchema,
  normalizeFcfaCountry,
} from "./kyc";

describe("KYC Schema & Types", () => {
  it("contains 14 FCFA countries in Africa", () => {
    expect(FCFA_COUNTRIES).toHaveLength(14);
    expect(FCFA_COUNTRY_CODES).toHaveLength(14);
    expect(FCFA_COUNTRY_CODES).toContain("BJ");
    expect(FCFA_COUNTRY_CODES).toContain("CI");
    expect(FCFA_COUNTRY_CODES).toContain("SN");
  });

  it("normalizes country input correctly", () => {
    expect(normalizeFcfaCountry("Bénin")).toBe("BJ");
    expect(normalizeFcfaCountry("benin")).toBe("BJ");
    expect(normalizeFcfaCountry("Côte d'Ivoire")).toBe("CI");
    expect(normalizeFcfaCountry("Sénégal")).toBe("SN");
    expect(normalizeFcfaCountry("BJ")).toBe("BJ");
    expect(normalizeFcfaCountry("Unknown")).toBeUndefined();
  });

  it("validates doc types for upload steps", () => {
    expect(KYC_DOC_TYPES).toEqual(["ID_FRONT", "ID_BACK"]);
    const uploadSteps = KYC_STEPS.filter((s) => s.kind === "upload");
    expect(uploadSteps).toHaveLength(2);
    expect(uploadSteps.map((s) => (s as { docType: string }).docType)).toEqual([
      "ID_FRONT",
      "ID_BACK",
    ]);
  });

  it("validates minimal valid kyc input without id_number or id_expiry", () => {
    const valid = {
      birth_date: "1990-01-01",
      country: "BJ",
      city: "Cotonou",
      address: "Haie Vive",
      phone: "+22997000000",
      profession: "Commerçant",
      monthly_income_estimate: 250000,
      id_type: "CNI",
    };
    const result = kycSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("defines the 7 KYC steps without financial information and without selfie", () => {
    expect(KYC_STEPS).toHaveLength(7);
    const titles: readonly string[] = KYC_STEPS.map((s) => s.title);
    expect(titles).not.toContain("Informations financières");
    expect(titles).not.toContain("Selfie de vérification");
  });
});

import { describe, expect, it } from "vitest";

import { requiredOnboardingPath } from "./auth-flow";

describe("garde d'onboarding client", () => {
  it("impose la création du PIN en premier", () => {
    expect(requiredOnboardingPath({ pin_set: false, kyc_status: "COMPLETED" })).toBe(
      "/auth/set-pin",
    );
  });

  it.each([null, "NONE", "INFO_REQUESTED"])("impose le KYC pour le statut %s", (kyc_status) => {
    expect(requiredOnboardingPath({ pin_set: true, kyc_status })).toBe("/client/kyc");
  });

  it.each(["PENDING", "IN_REVIEW", "COMPLETED", "REJECTED"])(
    "libère l'espace client pour le statut %s",
    (kyc_status) => {
      expect(requiredOnboardingPath({ pin_set: true, kyc_status })).toBeNull();
    },
  );
});

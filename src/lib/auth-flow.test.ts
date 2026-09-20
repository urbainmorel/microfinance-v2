import { describe, expect, it } from "vitest";

import { requiredOnboardingPath } from "./auth-flow";

describe("garde d'onboarding client", () => {
  it("impose la création du PIN en premier", () => {
    expect(requiredOnboardingPath({ pin_set: false, kyc_status: "COMPLETED" })).toBe(
      "/auth/set-pin",
    );
  });

  it.each([null, "NONE", "INFO_REQUESTED", "PENDING", "IN_REVIEW", "COMPLETED", "REJECTED"])(
    "libère l'espace client pour le statut KYC %s dès que le PIN est défini",
    (kyc_status) => {
      expect(requiredOnboardingPath({ pin_set: true, kyc_status })).toBeNull();
    },
  );
});

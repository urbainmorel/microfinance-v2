import { describe, expect, it } from "vitest";

import { forgotPasswordSchema, updatePasswordSchema } from "./auth";

describe("récupération du mot de passe", () => {
  it("valide une adresse email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "client@example.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "invalide" }).success).toBe(false);
  });

  it("impose la politique forte au nouveau mot de passe", () => {
    expect(
      updatePasswordSchema.safeParse({ password: "Nouveau1", confirm: "Nouveau1" }).success,
    ).toBe(true);
    expect(updatePasswordSchema.safeParse({ password: "faible", confirm: "faible" }).success).toBe(
      false,
    );
  });

  it("refuse une confirmation différente", () => {
    expect(
      updatePasswordSchema.safeParse({ password: "Nouveau1", confirm: "Nouveau2" }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { APP_ROLES, isAdminRole, normalizeAppRole } from "./access-control";

describe("contrat d'accès à deux rôles", () => {
  it("expose uniquement client et admin", () => {
    expect(APP_ROLES).toEqual(["client", "admin"]);
  });

  it("accorde le privilège uniquement au claim admin exact", () => {
    expect(normalizeAppRole("admin")).toBe("admin");
    expect(isAdminRole("admin")).toBe(true);
  });

  it.each([
    undefined,
    null,
    "",
    "client",
    "agent_credit",
    "agent_caisse",
    "validator",
    "auditor",
    "super_admin",
  ])("traite le claim %s comme client", (claim) => {
    expect(normalizeAppRole(claim)).toBe("client");
    expect(isAdminRole(claim)).toBe(false);
  });
});

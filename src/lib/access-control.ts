export const APP_ROLES = ["client", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/**
 * Fail-closed normalization for authenticated users. Only the exact admin
 * claim grants back-office access; missing, unknown and retired claims are clients.
 */
export function normalizeAppRole(value: unknown): AppRole {
  return value === "admin" ? "admin" : "client";
}

export function isAdminRole(value: unknown): value is "admin" {
  return value === "admin";
}

type TokenAppMetadata = { account_active?: unknown; user_role?: unknown };

function tokenAppMetadata(value: unknown): TokenAppMetadata {
  return typeof value === "object" && value !== null ? (value as TokenAppMetadata) : {};
}

export function isAccountInactive(value: unknown): boolean {
  return tokenAppMetadata(value).account_active === false;
}

export function roleFromAppMetadata(value: unknown): AppRole {
  return normalizeAppRole(tokenAppMetadata(value).user_role);
}

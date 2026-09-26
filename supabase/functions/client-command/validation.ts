import { CommandError } from "./errors.ts";
import type { JsonObject } from "./types.ts";

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertExactKeys(
  value: JsonObject,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    throw new CommandError("VALIDATION_ERROR", 400, "Champs invalides");
  }
}

export function requiredString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    throw new CommandError("VALIDATION_ERROR", 400, "Texte invalide");
  }
  const result = value.trim();
  if (!result || result.length > maxLength) {
    throw new CommandError("VALIDATION_ERROR", 400, "Texte invalide");
  }
  return result;
}

export function optionalString(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value, maxLength);
}

export function positiveAmount(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new CommandError("VALIDATION_ERROR", 400, "Montant invalide");
  }
  return value as number;
}

export function nonNegativeAmount(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new CommandError("VALIDATION_ERROR", 400, "Montant invalide");
  }
  return value as number;
}

export function positiveInteger(value: unknown, maximum: number): number {
  if (!Number.isInteger(value) || (value as number) <= 0 || (value as number) > maximum) {
    throw new CommandError("VALIDATION_ERROR", 400, "Entier invalide");
  }
  return value as number;
}

export function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new CommandError("VALIDATION_ERROR", 400, "UUID invalide");
  }
  return value.toLowerCase();
}

export function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new CommandError("VALIDATION_ERROR", 400, "Valeur invalide");
  }
  return value as T;
}

export function proofPath(value: unknown): string {
  const path = requiredString(value, 512);
  if (
    path.startsWith("/") ||
    /^https?:\/\//i.test(path) ||
    path.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new CommandError("VALIDATION_ERROR", 400, "Chemin de preuve invalide");
  }
  return path;
}

export function requiredElectronicReference(method: string, value: unknown): string | null {
  const reference = optionalString(value, 120);
  if (method !== "CASH" && !reference) {
    throw new CommandError("VALIDATION_ERROR", 400, "Reference requise");
  }
  return reference;
}

export function ownedDocumentPaths(value: unknown, userId: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10) {
    throw new CommandError("VALIDATION_ERROR", 400, "Documents invalides");
  }
  const paths = value.map((entry) => {
    const path = proofPath(entry);
    if (!path.startsWith(`${userId}/`)) {
      throw new CommandError("FORBIDDEN", 403, "Chemin de document interdit");
    }
    return path;
  });
  if (new Set(paths).size !== paths.length) {
    throw new CommandError("VALIDATION_ERROR", 400, "Documents invalides");
  }
  return paths;
}

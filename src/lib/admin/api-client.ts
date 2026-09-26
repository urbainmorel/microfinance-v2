import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import type { ClientSummary } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DbRecord = Record<string, unknown>;

export const adminSupabase = createSupabaseBrowserClient() as unknown as SupabaseClient;
export const browserClient = adminSupabase;

export function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  return numberValue(value);
}

export function rows(data: unknown): DbRecord[] {
  return Array.isArray(data) ? (data as DbRecord[]) : [];
}

export function asRecord(data: unknown): DbRecord {
  if (Array.isArray(data)) return (data[0] as DbRecord | undefined) ?? {};
  return data && typeof data === "object" ? (data as DbRecord) : {};
}

export function mapClient(row: DbRecord): ClientSummary {
  return {
    id: textValue(row.id),
    firstname: textValue(row.firstname),
    lastname: textValue(row.lastname),
    phone: optionalText(row.phone),
  };
}

export async function getClientMap(clientIds: string[]): Promise<Map<string, ClientSummary>> {
  const uniqueIds = [...new Set(clientIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, firstname, lastname, phone")
    .in("id", uniqueIds);
  if (error) throw new Error(error.message);
  return new Map(rows(data).map((row) => [textValue(row.id), mapClient(row)]));
}

export async function createPrivateProofUrl(bucket: string, path: unknown): Promise<string | null> {
  const privatePath = optionalText(path);
  if (!privatePath) return null;
  const { data, error } = await adminSupabase.storage
    .from(bucket)
    .createSignedUrl(privatePath, 300);
  return error ? null : data.signedUrl;
}

export async function callRpc(name: string, args: DbRecord): Promise<void> {
  const { error } = await adminSupabase.rpc(name, args);
  if (error) throw new Error(error.message);
}

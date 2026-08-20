import { roleFromAppMetadata } from "@/lib/access-control";

import {
  adminSupabase,
  getClientMap,
  mapClient,
  optionalText,
  rows,
  textValue,
} from "./api-client";

import type {
  AccountRole,
  AdminUserItem,
  DataErasureRequestItem,
  PaginatedResult,
  StaffRole,
} from "./types";

export async function getCurrentStaffRole(): Promise<StaffRole> {
  const { data, error } = await adminSupabase.auth.getClaims();
  if (error) throw new Error(error.message);
  const role = roleFromAppMetadata(data?.claims?.app_metadata);
  if (role === "admin") return role;
  throw new Error("Le rôle administrateur est introuvable dans la session.");
}

export async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await adminSupabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!user) throw new Error("Session utilisateur introuvable.");
  return user.id;
}

interface UserFilters {
  page: number;
  pageSize?: number;
  role?: AccountRole;
  active?: boolean;
}

export async function getAdminUsers(filters: UserFilters): Promise<PaginatedResult<AdminUserItem>> {
  const pageSize = filters.pageSize ?? 25;
  const safePage = Math.max(1, filters.page);
  const from = (safePage - 1) * pageSize;
  let query = adminSupabase
    .from("profiles")
    .select("id, firstname, lastname, phone, role, is_active, kyc_status, created_at", {
      count: "exact",
    });
  if (filters.role) query = query.eq("role", filters.role);
  if (filters.active !== undefined) query = query.eq("is_active", filters.active);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);
  return {
    items: rows(data).map((row) => ({
      ...mapClient(row),
      role: textValue(row.role) as AccountRole,
      isActive: row.is_active !== false,
      kycStatus: textValue(row.kyc_status),
      createdAt: textValue(row.created_at),
    })),
    total: count ?? 0,
    page: safePage,
    pageSize,
  };
}

export async function getDataErasureRequests({ page, pageSize = 25 }: UserFilters) {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const { data, error, count } = await adminSupabase
    .from("data_erasure_requests")
    .select("id, user_id, reason, status, processed_by, processed_at, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);
  const records = rows(data);
  const clients = await getClientMap(records.map((row) => textValue(row.user_id)));
  const items: DataErasureRequestItem[] = records.map((row) => {
    const userId = textValue(row.user_id);
    return {
      id: textValue(row.id),
      userId,
      requester: clients.get(userId) ?? null,
      reason: optionalText(row.reason),
      status: textValue(row.status),
      processedBy: optionalText(row.processed_by),
      processedAt: optionalText(row.processed_at),
      createdAt: textValue(row.created_at),
    };
  });
  return { items, total: count ?? 0, page: safePage, pageSize };
}

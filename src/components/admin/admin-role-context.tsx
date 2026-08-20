"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

import { getCurrentStaffRole } from "@/lib/admin/api";
import { adminKeys } from "@/lib/admin/hooks";

import type { AdminPermission, StaffRole } from "@/lib/admin/types";

interface AdminRoleValue {
  role: StaffRole | null;
  isLoading: boolean;
  can: (permission: AdminPermission) => boolean;
}

const AdminRoleContext = createContext<AdminRoleValue | null>(null);

export function AdminRoleProvider({ children }: { children: React.ReactNode }) {
  const roleQuery = useQuery({
    queryKey: adminKeys.role,
    queryFn: getCurrentStaffRole,
    staleTime: 60_000,
  });
  const role = roleQuery.data ?? null;

  return (
    <AdminRoleContext.Provider
      value={{
        role,
        isLoading: roleQuery.isPending,
        can: () => role === "admin",
      }}
    >
      {children}
    </AdminRoleContext.Provider>
  );
}

export function useAdminRole(): AdminRoleValue {
  const value = useContext(AdminRoleContext);
  if (!value) throw new Error("useAdminRole doit être utilisé dans AdminRoleProvider.");
  return value;
}

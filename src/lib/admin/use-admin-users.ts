"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getAdminUsers, getCurrentUserId, manageUserStatus } from "@/lib/admin/api";
import { downloadCsv } from "@/lib/admin/csv";
import { formatRole } from "@/lib/admin/format";

import type { AccountRole } from "@/lib/admin/types";

export const USER_PAGE_SIZE = 25;
export type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";
export type RoleFilter = "ALL" | AccountRole;
export type UserCommand = { type: "status"; userId: string; active: boolean };

function exportUsers(page: number, items: Awaited<ReturnType<typeof getAdminUsers>>["items"]) {
  downloadCsv(
    `utilisateurs-page-${page}.csv`,
    ["Identifiant", "Prénom", "Nom", "Téléphone", "Rôle", "Actif", "KYC", "Créé le"],
    items.map((user) => [
      user.id,
      user.firstname,
      user.lastname,
      user.phone,
      formatRole(user.role),
      user.isActive ? "Oui" : "Non",
      user.kycStatus,
      user.createdAt,
    ]),
  );
}

async function mutateUser(command: UserCommand) {
  return manageUserStatus(command.userId, command.active);
}

export function useAdminUsers() {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryKey: ["admin", "users", page, roleFilter, activeFilter],
    queryFn: () =>
      getAdminUsers({
        page,
        pageSize: USER_PAGE_SIZE,
        role: roleFilter === "ALL" ? undefined : roleFilter,
        active: activeFilter === "ALL" ? undefined : activeFilter === "ACTIVE",
      }),
  });
  const currentUserQuery = useQuery({
    queryKey: ["admin", "current-user-id"],
    queryFn: getCurrentUserId,
  });
  const mutation = useMutation({
    mutationFn: mutateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
  const setFilters = (role: RoleFilter, active: ActiveFilter) => {
    setPage(1);
    setRoleFilter(role);
    setActiveFilter(active);
  };
  const totalPages = Math.max(1, Math.ceil((usersQuery.data?.total ?? 0) / USER_PAGE_SIZE));
  return {
    page,
    setPage,
    roleFilter,
    activeFilter,
    setFilters,
    usersQuery,
    currentUserQuery,
    mutation,
    totalPages,
    exportPage: () => exportUsers(page, usersQuery.data?.items ?? []),
  };
}

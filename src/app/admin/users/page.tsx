"use client";

import { Download } from "lucide-react";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { UserCard, UserFilters } from "@/components/admin/user-management";
import { Button } from "@/components/ui/button";
import { useAdminUsers } from "@/lib/admin/use-admin-users";

export default function AdminUsersPage() {
  const state = useAdminUsers();
  const items = state.usersQuery.data?.items ?? [];
  return (
    <>
      <AdminPageHeader
        eyebrow="Accès"
        title="Utilisateurs"
        description="Consultez les comptes, filtrez les rôles et gérez les accès selon vos permissions."
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={state.exportPage}
            disabled={!items.length}
          >
            <Download className="size-4" /> Exporter la page
          </Button>
        }
      />
      <UserFilters role={state.roleFilter} active={state.activeFilter} change={state.setFilters} />
      {state.usersQuery.isPending ? <AdminLoading /> : null}
      {state.usersQuery.isError ? <AdminError message={state.usersQuery.error.message} /> : null}
      {items.length === 0 && state.usersQuery.data ? (
        <AdminEmpty label="Aucun utilisateur" />
      ) : null}
      <div className="space-y-3">
        {items.map((user) => {
          const affected = state.mutation.variables?.userId === user.id;
          const pending = state.mutation.isPending && affected;
          return (
            <UserCard
              key={user.id}
              user={user}
              currentUserId={state.currentUserQuery.data}
              canManageStatus
              pending={pending}
              error={affected ? state.mutation.error : null}
              success={affected && state.mutation.isSuccess}
              mutate={state.mutation.mutate}
            />
          );
        })}
      </div>
      <AdminPagination
        page={state.page}
        totalPages={state.totalPages}
        total={state.usersQuery.data?.total ?? 0}
        noun="compte(s)"
        fetching={state.usersQuery.isFetching}
        setPage={state.setPage}
      />
    </>
  );
}

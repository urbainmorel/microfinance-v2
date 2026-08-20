import { Power, ShieldCheck } from "lucide-react";

import { MutationFeedback } from "@/components/admin/admin-page";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { clientName, formatDate, formatRole } from "@/lib/admin/format";

import type { AccountRole, AdminUserItem } from "@/lib/admin/types";
import type { ActiveFilter, RoleFilter, UserCommand } from "@/lib/admin/use-admin-users";

export const accountRoles: AccountRole[] = ["client", "admin"];

export function UserFilters({
  role,
  active,
  change,
}: {
  role: RoleFilter;
  active: ActiveFilter;
  change: (role: RoleFilter, active: ActiveFilter) => void;
}) {
  return (
    <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">
        Rôle
        <select
          value={role}
          onChange={(event) => change(event.target.value as RoleFilter, active)}
          className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal"
        >
          <option value="ALL">Tous les rôles</option>
          {accountRoles.map((item) => (
            <option key={item} value={item}>
              {item === "client" ? "Client" : formatRole(item)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        État du compte
        <select
          value={active}
          onChange={(event) => change(role, event.target.value as ActiveFilter)}
          className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal"
        >
          <option value="ALL">Tous les états</option>
          <option value="ACTIVE">Actifs</option>
          <option value="INACTIVE">Désactivés</option>
        </select>
      </label>
    </div>
  );
}

function UserActions({
  user,
  canManageStatus,
  isSelf,
  pending,
  mutate,
}: {
  user: AdminUserItem;
  canManageStatus: boolean;
  isSelf: boolean;
  pending: boolean;
  mutate: (command: UserCommand) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <p className="rounded-xl border border-input bg-muted px-3 py-2 text-sm font-semibold">
        {formatRole(user.role)}
      </p>
      {canManageStatus ? (
        <Button
          type="button"
          size="sm"
          variant={user.isActive ? "outline" : "default"}
          disabled={pending || (isSelf && user.isActive)}
          title={
            isSelf && user.isActive
              ? "Vous ne pouvez pas désactiver votre propre compte."
              : undefined
          }
          onClick={() => mutate({ type: "status", userId: user.id, active: !user.isActive })}
        >
          {user.isActive ? <Power className="size-4" /> : <ShieldCheck className="size-4" />}
          {pending ? "Traitement…" : user.isActive ? "Désactiver" : "Activer"}
        </Button>
      ) : null}
    </div>
  );
}

export function UserCard({
  user,
  currentUserId,
  canManageStatus,
  pending,
  error,
  success,
  mutate,
}: {
  user: AdminUserItem;
  currentUserId?: string;
  canManageStatus: boolean;
  pending: boolean;
  error: Error | null;
  success: boolean;
  mutate: (command: UserCommand) => void;
}) {
  const isSelf = currentUserId === user.id;
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold">{clientName(user)}</h2>
            <StatusBadge status={user.isActive ? "ACTIVE" : "CANCELLED"} />
            {isSelf ? (
              <span className="text-xs font-semibold text-muted-foreground">Votre compte</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.phone ?? "Téléphone non renseigné"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            KYC : {user.kycStatus} · Créé le {formatDate(user.createdAt)}
          </p>
        </div>
        <UserActions
          user={user}
          canManageStatus={canManageStatus}
          isSelf={isSelf}
          pending={pending}
          mutate={mutate}
        />
      </div>
      <MutationFeedback error={error} success={success} />
    </article>
  );
}

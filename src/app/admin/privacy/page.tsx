"use client";

import { Download } from "lucide-react";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { useAdminRole } from "@/components/admin/admin-role-context";
import { PrivacyRequestCard } from "@/components/admin/privacy-requests";
import { Button } from "@/components/ui/button";
import { usePrivacyRequests } from "@/lib/admin/use-privacy-requests";

export default function AdminPrivacyPage() {
  const state = usePrivacyRequests();
  const { role } = useAdminRole();
  const items = state.query.data?.items ?? [];
  return (
    <>
      <AdminPageHeader
        eyebrow="Protection des données"
        title="Demandes d’effacement"
        description="Suivez les demandes et conservez une décision motivée. L’anonymisation est définitive."
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
      {state.query.isPending ? <AdminLoading /> : null}
      {state.query.isError ? <AdminError message={state.query.error.message} /> : null}
      {items.length === 0 && state.query.data ? (
        <AdminEmpty label="Aucune demande d’effacement" />
      ) : null}
      <div className="space-y-4">
        {items.map((request) => {
          const affected = state.mutation.variables?.requestId === request.id;
          const pending = state.mutation.isPending && affected;
          return (
            <PrivacyRequestCard
              key={request.id}
              request={request}
              canProcess={role === "admin"}
              reason={state.reasons[request.id] ?? ""}
              pending={pending}
              error={affected ? state.mutation.error : null}
              success={affected && state.mutation.isSuccess}
              setReason={(reason) => state.setReason(request.id, reason)}
              submit={(action) => state.submit(request.id, action)}
            />
          );
        })}
      </div>
      <AdminPagination
        page={state.page}
        totalPages={state.totalPages}
        total={state.query.data?.total ?? 0}
        noun="demande(s)"
        fetching={state.query.isFetching}
        setPage={state.setPage}
      />
    </>
  );
}

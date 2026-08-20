"use client";

import { useQuery } from "@tanstack/react-query";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { useAdminRole } from "@/components/admin/admin-role-context";
import { KycQueueCard } from "@/components/admin/kyc-queue-card";
import { getKycQueue, reviewKyc } from "@/lib/admin/api";
import { adminKeys, useAdminMutation } from "@/lib/admin/hooks";

export default function AdminKycPage() {
  const query = useQuery({ queryKey: adminKeys.kyc, queryFn: getKycQueue });
  const mutation = useAdminMutation(
    ({ id, action, reason }: { id: string; action: string; reason: string | null }) =>
      reviewKyc(id, action, reason),
    [adminKeys.kyc, adminKeys.kpis],
  );
  const { can } = useAdminRole();

  return (
    <>
      <AdminPageHeader
        eyebrow="Conformité"
        title="File KYC"
        description="Vérifiez l’identité et les informations déclarées avant d’autoriser les opérations."
      />
      {query.isPending ? <AdminLoading /> : null}
      {query.isError ? <AdminError message={query.error.message} /> : null}
      {query.data?.length === 0 ? <AdminEmpty label="Aucun dossier KYC" /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {query.data?.map((item) => (
          <KycQueueCard
            key={item.id}
            item={item}
            canReview={can("kyc")}
            busy={mutation.isPending}
            error={mutation.error}
            success={mutation.isSuccess}
            onReview={(action, reason) => mutation.mutate({ id: item.id, action, reason })}
          />
        ))}
      </div>
    </>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  MutationFeedback,
} from "@/components/admin/admin-page";
import { useAdminRole } from "@/components/admin/admin-role-context";
import { QueueCard } from "@/components/admin/queue-card";
import { StaffActions } from "@/components/admin/staff-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { getKycQueue, reviewKyc } from "@/lib/admin/api";
import { formatCurrency, formatDate } from "@/lib/admin/format";
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
          <QueueCard
            key={item.id}
            title={`${item.firstname} ${item.lastname}`}
            subtitle={item.phone ?? "Téléphone non renseigné"}
            status={<StatusBadge status={item.kycStatus} />}
            facts={[
              {
                label: "Pièce",
                value: [item.idType, item.idNumber].filter(Boolean).join(" · ") || "Non renseignée",
              },
              {
                label: "Localité",
                value: [item.city, item.country].filter(Boolean).join(", ") || "Non renseignée",
              },
              { label: "Profession", value: item.profession ?? "Non renseignée" },
              {
                label: "Revenu estimé",
                value: item.monthlyIncomeEstimate
                  ? formatCurrency(item.monthlyIncomeEstimate)
                  : "Non renseigné",
              },
              { label: "Créé le", value: formatDate(item.createdAt) },
            ]}
          >
            {can("kyc") && ["PENDING", "IN_REVIEW", "INFO_REQUESTED"].includes(item.kycStatus) ? (
              <StaffActions
                busy={mutation.isPending}
                actions={[
                  { value: "VALIDATE", label: "Valider", tone: "accent" },
                  {
                    value: "REQUEST_INFO",
                    label: "Demander un complément",
                    requiresReason: true,
                    tone: "outline",
                  },
                  { value: "REJECT", label: "Rejeter", requiresReason: true },
                ]}
                onSubmit={(action, values) =>
                  mutation.mutate({ id: item.id, action, reason: values.reason })
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Consultation en lecture seule.</p>
            )}
            <MutationFeedback error={mutation.error} success={mutation.isSuccess} />
          </QueueCard>
        ))}
      </div>
    </>
  );
}

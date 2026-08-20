"use client";

import { useQuery } from "@tanstack/react-query";

import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid";
import { AdminError, AdminLoading, AdminPageHeader } from "@/components/admin/admin-page";
import { getAdminKpis } from "@/lib/admin/api";
import { adminKeys } from "@/lib/admin/hooks";

export default function AdminHomePage() {
  const query = useQuery({ queryKey: adminKeys.kpis, queryFn: getAdminKpis });

  return (
    <>
      <AdminPageHeader
        eyebrow="Vue d’ensemble"
        title="Tableau de bord"
        description="Les indicateurs opérationnels essentiels, actualisés depuis la base sécurisée."
      />
      {query.isPending ? <AdminLoading /> : null}
      {query.isError ? <AdminError message={query.error.message} /> : null}
      {query.data ? <AdminKpiGrid kpis={query.data} /> : null}
    </>
  );
}

"use client";

import { KycStatusBadge } from "@/components/dashboard/kyc-status-badge";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { useClientLocale } from "@/components/i18n/client-locale-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/lib/hooks/use-profile";

/** En-tête du dashboard (PRD §7.1) : salutation, badge de statut KYC, cloche notifications. */
export function DashboardHeader() {
  const { data } = useProfile();
  const { t } = useClientLocale();
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{t("common.hello")}</p>
        {data ? (
          <h1 className="truncate font-display text-2xl font-bold text-foreground">
            {data.firstname}
          </h1>
        ) : (
          <Skeleton className="mt-1 h-7 w-32" />
        )}
        {data ? <KycStatusBadge status={data.kyc_status} /> : null}
      </div>
      <NotificationBell />
    </header>
  );
}

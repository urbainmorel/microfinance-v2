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
    <header className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{t("common.hello")}</p>
        {data ? (
          <h1 className="mt-1 truncate font-display text-[28px] font-bold tracking-[-0.035em] text-foreground sm:text-[32px]">
            {data.firstname}, bienvenue
          </h1>
        ) : (
          <Skeleton className="mt-2 h-8 w-56" />
        )}
        {data ? (
          <div className="mt-2">
            <KycStatusBadge status={data.kyc_status} />
          </div>
        ) : null}
      </div>
      <NotificationBell />
    </header>
  );
}

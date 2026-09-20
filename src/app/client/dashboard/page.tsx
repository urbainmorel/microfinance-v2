"use client";

import { AlertCircle } from "lucide-react";

import { QuickActions } from "@/components/client/quick-actions";
import { ContractPendingBanner } from "@/components/dashboard/contract-pending-banner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FinancingOffersCarousel } from "@/components/dashboard/financing-offers-carousel";
import { GuaranteeReminderBanner } from "@/components/dashboard/guarantee-reminder-banner";
import { KycNoticeBanner } from "@/components/dashboard/kyc-notice-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { WalletCard } from "@/components/wallet/wallet-card";
import { WalletCardSkeleton } from "@/components/wallet/wallet-card-skeleton";
import { useWallet } from "@/lib/hooks/use-wallet";

export default function ClientDashboardPage() {
  const { data, isPending, isError } = useWallet();

  return (
    <div className="flex flex-col gap-7">
      <DashboardHeader />
      <KycNoticeBanner />
      <ContractPendingBanner />
      <GuaranteeReminderBanner />
      {isPending ? (
        <WalletCardSkeleton />
      ) : isError || !data ? (
        <EmptyState
          icon={AlertCircle}
          title="Portefeuille indisponible"
          hint="Réessayez dans un instant."
        />
      ) : (
        <WalletCard summary={data.summary} subAccounts={data.subAccounts} />
      )}
      <QuickActions />
      <FinancingOffersCarousel />
    </div>
  );
}

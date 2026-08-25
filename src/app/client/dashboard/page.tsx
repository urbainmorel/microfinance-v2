"use client";

import { AlertCircle } from "lucide-react";

import { QuickActions } from "@/components/client/quick-actions";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FinancingOffersCarousel } from "@/components/dashboard/financing-offers-carousel";
import { EmptyState } from "@/components/ui/empty-state";
import { WalletCard } from "@/components/wallet/wallet-card";
import { WalletCardSkeleton } from "@/components/wallet/wallet-card-skeleton";
import { useWallet } from "@/lib/hooks/use-wallet";

export default function ClientDashboardPage() {
  const { data, isPending, isError } = useWallet();

  return (
    <div className="flex flex-col gap-7">
      <DashboardHeader />
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

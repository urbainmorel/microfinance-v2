"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LoanCard } from "@/components/dashboard/loan-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WalletCard } from "@/components/wallet/wallet-card";
import { WalletCardSkeleton } from "@/components/wallet/wallet-card-skeleton";
import { useWallet } from "@/lib/hooks/use-wallet";

export default function ClientDashboardPage() {
  const { data, isPending, isError } = useWallet();

  return (
    <div className="flex flex-col gap-5">
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
        <>
          <WalletCard summary={data.summary} subAccounts={data.subAccounts} />
          <div className="grid grid-cols-2 gap-3">
            <Link href="/client/withdraw/momo" className={buttonVariants({ variant: "outline" })}>
              Retirer
            </Link>
            <Link href="/client/deposit/request" className={buttonVariants({ variant: "accent" })}>
              Déposer
            </Link>
          </div>
          <Link
            href="/client/savings"
            className="text-center text-sm font-semibold text-accent hover:underline"
          >
            Voir le détail de mon épargne
          </Link>
        </>
      )}

      <LoanCard />
    </div>
  );
}

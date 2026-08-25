import {
  BadgeDollarSign,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  HandCoins,
  Landmark,
  ListChecks,
  ReceiptText,
  Users,
  WalletCards,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/admin/format";

import type { AdminKpis } from "@/lib/admin/types";

interface KpiCard {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: string;
}

function cards(kpis: AdminKpis): KpiCard[] {
  return [
    {
      label: "Clients",
      value: kpis.totalClients,
      icon: Users,
      tone: "bg-secondary text-accent",
    },
    {
      label: "KYC en attente",
      value: kpis.pendingKyc,
      icon: ClipboardCheck,
      tone: "bg-pastel-gold text-warning",
    },
    {
      label: "KYC validés",
      value: kpis.completedKyc,
      icon: FileCheck2,
      tone: "bg-muted text-success",
    },
    {
      label: "Demandes de prêt",
      value: kpis.pendingLoanRequests,
      icon: ListChecks,
      tone: "bg-secondary text-accent",
    },
    {
      label: "Dépôts en attente",
      value: kpis.pendingDeposits,
      icon: HandCoins,
      tone: "bg-secondary text-accent",
    },
    {
      label: "Retraits en attente",
      value: kpis.pendingWithdrawals,
      icon: BadgeDollarSign,
      tone: "bg-muted text-foreground",
    },
    {
      label: "Remboursements en attente",
      value: kpis.pendingRepayments,
      icon: ReceiptText,
      tone: "bg-pastel-gold text-warning",
    },
    {
      label: "Prêts actifs",
      value: kpis.activeLoans,
      icon: Landmark,
      tone: "bg-muted text-success",
    },
    {
      label: "Prêts en retard",
      value: kpis.overdueLoans,
      icon: Waypoints,
      tone: "bg-pastel-gold text-warning",
    },
    {
      label: "Total décaissé",
      value: formatCurrency(kpis.totalDisbursed),
      icon: WalletCards,
      tone: "bg-secondary text-accent",
    },
    {
      label: "Total remboursé",
      value: formatCurrency(kpis.totalRepaid),
      icon: CircleDollarSign,
      tone: "bg-muted text-success",
    },
  ];
}

export function AdminKpiGrid({ kpis }: { kpis: AdminKpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {cards(kpis).map(({ label, value, icon: Icon, tone }) => (
        <Card key={label} className="min-h-[132px] p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="max-w-[12rem] text-xs font-semibold leading-5 text-muted-foreground">
              {label}
            </p>
            <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}>
              <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
            </div>
          </div>
          <p className="mt-5 break-words font-display text-[26px] font-bold leading-none tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
            {value}
          </p>
        </Card>
      ))}
    </div>
  );
}

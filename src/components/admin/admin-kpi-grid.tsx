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
    { label: "Clients", value: kpis.totalClients, icon: Users, tone: "bg-secondary" },
    {
      label: "KYC en attente",
      value: kpis.pendingKyc,
      icon: ClipboardCheck,
      tone: "bg-[hsl(var(--pastel-gold))]",
    },
    { label: "KYC validés", value: kpis.completedKyc, icon: FileCheck2, tone: "bg-secondary" },
    {
      label: "Demandes de prêt",
      value: kpis.pendingLoanRequests,
      icon: ListChecks,
      tone: "bg-[hsl(var(--pastel-blue))]",
    },
    {
      label: "Dépôts en attente",
      value: kpis.pendingDeposits,
      icon: HandCoins,
      tone: "bg-[hsl(var(--pastel-blue))]",
    },
    {
      label: "Retraits en attente",
      value: kpis.pendingWithdrawals,
      icon: BadgeDollarSign,
      tone: "bg-muted",
    },
    {
      label: "Remboursements en attente",
      value: kpis.pendingRepayments,
      icon: ReceiptText,
      tone: "bg-[hsl(var(--pastel-gold))]",
    },
    { label: "Prêts actifs", value: kpis.activeLoans, icon: Landmark, tone: "bg-secondary" },
    {
      label: "Prêts en retard",
      value: kpis.overdueLoans,
      icon: Waypoints,
      tone: "bg-[hsl(var(--pastel-gold))]",
    },
    {
      label: "Total décaissé",
      value: formatCurrency(kpis.totalDisbursed),
      icon: WalletCards,
      tone: "bg-[hsl(var(--pastel-blue))]",
    },
    {
      label: "Total remboursé",
      value: formatCurrency(kpis.totalRepaid),
      icon: CircleDollarSign,
      tone: "bg-secondary",
    },
  ];
}

export function AdminKpiGrid({ kpis }: { kpis: AdminKpis }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards(kpis).map(({ label, value, icon: Icon, tone }) => (
        <Card key={label} className="relative overflow-hidden">
          <div className={`mb-5 grid size-11 place-items-center rounded-2xl ${tone}`}>
            <Icon className="size-5" aria-hidden />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p>
        </Card>
      ))}
    </div>
  );
}

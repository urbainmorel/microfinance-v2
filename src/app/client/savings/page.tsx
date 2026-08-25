"use client";

import { History, Lock, PiggyBank, ShieldCheck, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFcfa } from "@/lib/format";
import { useWallet } from "@/lib/hooks/use-wallet";

export default function SavingsPage() {
  const { data, isPending } = useWallet();
  const s = data?.subAccounts;
  const rows: { key: string; icon: LucideIcon; label: string; hint: string; value: number }[] = s
    ? [
        {
          key: "free",
          icon: PiggyBank,
          label: "Épargne libre",
          hint: "Retirable, hors retraits en attente",
          value: s.free_savings,
        },
        {
          key: "guarantee",
          icon: Lock,
          label: "Dépôt de garantie bloqué",
          hint: "Libéré à la clôture du prêt",
          value: s.blocked_guarantee,
        },
        {
          key: "mandatory",
          icon: ShieldCheck,
          label: "Épargne obligatoire",
          hint: "Constituée avec le crédit",
          value: s.mandatory_savings,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mon épargne"
        description="Une vue claire de vos avoirs disponibles, bloqués et obligatoires."
      />
      {isPending ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(({ key, icon: Icon, label, hint, value }) => (
            <Card key={key} className="flex items-center gap-4 p-4 sm:p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-finance-soft text-accent">
                <Icon className="size-5" strokeWidth={1.8} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              <span className="font-display font-bold text-foreground [font-variant-numeric:tabular-nums]">
                {formatFcfa(value)}
              </span>
            </Card>
          ))}
        </div>
      )}
      <h2 className="mt-2 font-display text-lg font-bold tracking-[-0.02em] text-foreground">
        Historique des mouvements
      </h2>
      <EmptyState
        icon={History}
        title="Aucun mouvement"
        hint="Vos crédits et débits s’afficheront ici."
      />
    </div>
  );
}

"use client";

import { ArrowDownToLine, ArrowUpFromLine, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { QuickActionModals, type QuickActionType } from "@/components/client/quick-action-modals";
import { Card } from "@/components/ui/card";
import { useActiveLoan } from "@/lib/hooks/use-active-loan";
import { useProfile } from "@/lib/hooks/use-profile";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

const ACTIONS: Array<{ id: QuickActionType; label: string; hint: string; icon: LucideIcon }> = [
  {
    id: "deposit-savings",
    label: "Déposer une épargne",
    hint: "Alimenter mon épargne",
    icon: ArrowDownToLine,
  },
  {
    id: "deposit-guarantee",
    label: "Déposer une garantie",
    hint: "Garantie de prêt",
    icon: ShieldCheck,
  },
  {
    id: "withdraw",
    label: "Retirer",
    hint: "Mobile Money ou banque",
    icon: ArrowUpFromLine,
  },
  {
    id: "repay",
    label: "Rembourser",
    hint: "Régler une échéance",
    icon: RotateCcw,
  },
];

function QuickActionButton({
  action,
  isKycVerified,
  isRestricted,
  onClick,
}: {
  action: (typeof ACTIONS)[number];
  isKycVerified: boolean;
  isRestricted: boolean;
  onClick: (id: QuickActionType) => void;
}) {
  const { id, label, hint, icon: Icon } = action;
  const showBadge = !isKycVerified || isRestricted;
  const lockColor = !isKycVerified ? "text-warning" : "text-accent";
  const hintText = !isKycVerified
    ? "Vérification requise"
    : isRestricted
      ? "Garantie requise"
      : hint;

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={cn(
        "group flex h-14 items-center gap-2 rounded-xl border border-border bg-background px-2.5 text-left transition-all hover:border-accent/30 hover:bg-finance-soft/45 sm:w-[140px] lg:w-[148px]",
        !isKycVerified && "opacity-90",
      )}
    >
      <span className="relative grid size-7 shrink-0 place-items-center rounded-lg bg-finance-soft text-accent">
        <Icon className="size-3.5" strokeWidth={1.9} aria-hidden />
        {showBadge ? (
          <span className="absolute -bottom-1 -right-1 grid size-3.5 place-items-center rounded-full border border-border bg-background">
            <Lock className={cn("size-2", lockColor)} aria-hidden />
          </span>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-bold text-foreground">{label}</span>
        <span className="mt-0.5 hidden truncate text-[10px] text-muted-foreground lg:block">
          {hintText}
        </span>
      </span>
    </button>
  );
}

export function QuickActions({ className }: { className?: string }) {
  const { data: profile } = useProfile();
  const { data: loan } = useActiveLoan();
  const isKycVerified = profile?.kyc_status === "COMPLETED";

  const [active, setActive] = useState<QuickActionType | null>(null);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [guaranteeModalOpen, setGuaranteeModalOpen] = useState(false);

  const hasPendingGuarantee =
    Boolean(loan?.guaranteeRequired) &&
    !loan?.guaranteeSatisfied &&
    (loan?.remainingGuarantee ?? 0) > 0;

  function handleActionClick(id: QuickActionType) {
    if (!isKycVerified) {
      setKycModalOpen(true);
      return;
    }
    if (id === "withdraw" && hasPendingGuarantee) {
      setGuaranteeModalOpen(true);
      return;
    }
    setActive(id);
  }

  return (
    <>
      <Card role="group" aria-label="Actions rapides" className={cn("p-3 sm:p-4", className)}>
        <div className="grid grid-cols-2 gap-2 sm:inline-grid sm:grid-cols-4">
          {ACTIONS.map((action) => (
            <QuickActionButton
              key={action.id}
              action={action}
              isKycVerified={isKycVerified}
              isRestricted={action.id === "withdraw" && hasPendingGuarantee}
              onClick={handleActionClick}
            />
          ))}
        </div>
      </Card>

      <QuickActionModals
        active={active}
        setActive={setActive}
        kycModalOpen={kycModalOpen}
        setKycModalOpen={setKycModalOpen}
        guaranteeModalOpen={guaranteeModalOpen}
        setGuaranteeModalOpen={setGuaranteeModalOpen}
        kycStatus={profile?.kyc_status}
        loan={loan}
      />
    </>
  );
}

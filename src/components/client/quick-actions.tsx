"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  HandCoins,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

import { LoanRequestForm } from "@/components/loans/loan-request-form";
import { DepositRequestForm } from "@/components/operations/deposit-request-form";
import { RepaymentRequestForm } from "@/components/operations/repayment-request-form";
import { WithdrawalRequestForm } from "@/components/operations/withdrawal-request-form";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

type Action = "deposit" | "withdraw" | "withdraw-momo" | "withdraw-bank" | "repay" | "loan";

const ACTIONS: Array<{ id: Action; label: string; hint: string; icon: LucideIcon }> = [
  { id: "deposit", label: "Déposer", hint: "Alimenter mon épargne", icon: ArrowDownToLine },
  { id: "withdraw", label: "Retirer", hint: "Mobile Money ou banque", icon: ArrowUpFromLine },
  { id: "repay", label: "Rembourser", hint: "Régler une échéance", icon: RotateCcw },
  { id: "loan", label: "Simuler", hint: "Préparer un financement", icon: HandCoins },
];

const DIALOG_COPY: Record<Exclude<Action, "withdraw">, { title: string; description: string }> = {
  deposit: {
    title: "Faire un dépôt",
    description: "Renseignez le paiement, ajoutez son justificatif puis confirmez avec votre PIN.",
  },
  "withdraw-momo": {
    title: "Retrait Mobile Money",
    description: "Choisissez le bénéficiaire et vérifiez les informations avant confirmation.",
  },
  "withdraw-bank": {
    title: "Virement bancaire",
    description: "Renseignez le compte bénéficiaire puis confirmez votre demande sécurisée.",
  },
  repay: {
    title: "Rembourser mon prêt",
    description: "Sélectionnez le prêt, ajoutez votre paiement et confirmez la demande.",
  },
  loan: {
    title: "Simuler et demander un prêt",
    description:
      "Construisez votre financement étape par étape, sans engagement avant confirmation.",
  },
};

function WithdrawChoice({ choose }: { choose: (action: Action) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => choose("withdraw-momo")}
        className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-accent/35 hover:shadow-card"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-finance-soft text-accent">
          <Smartphone className="size-5" aria-hidden />
        </span>
        <span className="mt-5 block text-sm font-bold text-foreground">Mobile Money</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          Recevoir les fonds sur un numéro MTN, Moov, Orange ou Wave.
        </span>
      </button>
      <button
        type="button"
        onClick={() => choose("withdraw-bank")}
        className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-accent/35 hover:shadow-card"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-finance-soft text-accent">
          <Building2 className="size-5" aria-hidden />
        </span>
        <span className="mt-5 block text-sm font-bold text-foreground">Compte bancaire</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          Envoyer les fonds vers un compte domicilié dans l’espace UMOA.
        </span>
      </button>
    </div>
  );
}

function ActionContent({
  action,
  switchAction,
}: {
  action: Exclude<Action, "withdraw">;
  switchAction: (action: Action) => void;
}) {
  if (action === "deposit") return <DepositRequestForm />;
  if (action === "withdraw-momo")
    return (
      <WithdrawalRequestForm
        key="withdraw-momo"
        type="MOBILE_MONEY"
        onSwitchType={() => switchAction("withdraw-bank")}
      />
    );
  if (action === "withdraw-bank")
    return (
      <WithdrawalRequestForm
        key="withdraw-bank"
        type="BANK_TRANSFER"
        onSwitchType={() => switchAction("withdraw-momo")}
      />
    );
  if (action === "repay") return <RepaymentRequestForm />;
  return <LoanRequestForm />;
}

export function QuickActions({ className }: { className?: string }) {
  const [active, setActive] = useState<Action | null>(null);
  const modalCopy = active && active !== "withdraw" ? DIALOG_COPY[active] : null;

  return (
    <>
      <Card role="group" aria-label="Actions rapides" className={cn("p-3 sm:p-4", className)}>
        <div className="grid grid-cols-2 gap-2 sm:inline-grid sm:grid-cols-4">
          {ACTIONS.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className="group flex h-14 items-center gap-2 rounded-xl border border-border bg-background px-2.5 text-left transition-all hover:border-accent/30 hover:bg-finance-soft/45 sm:w-[140px] lg:w-[148px]"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-finance-soft text-accent">
                <Icon className="size-3.5" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-bold text-foreground">{label}</span>
                <span className="mt-0.5 hidden truncate text-[10px] text-muted-foreground lg:block">
                  {hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Modal
        open={active === "withdraw"}
        onOpenChange={(open) => !open && setActive(null)}
        title="Choisir un mode de retrait"
        description="Sélectionnez la destination qui convient à votre demande."
      >
        <WithdrawChoice choose={setActive} />
      </Modal>

      <Modal
        open={Boolean(modalCopy)}
        onOpenChange={(open) => !open && setActive(null)}
        title={modalCopy?.title ?? "Opération"}
        description={modalCopy?.description}
        className={active === "loan" ? "max-w-4xl" : undefined}
      >
        {active && active !== "withdraw" ? (
          <ActionContent action={active} switchAction={setActive} />
        ) : null}
      </Modal>
    </>
  );
}

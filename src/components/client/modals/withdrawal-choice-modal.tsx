"use client";

import { Building2, Smartphone } from "lucide-react";

import { Modal } from "@/components/ui/modal";

import type { QuickActionType } from "./types";

function WithdrawChoice({ choose }: { choose: (action: QuickActionType) => void }) {
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

export function WithdrawalChoiceModal({
  open,
  setActive,
}: {
  open: boolean;
  setActive: (action: QuickActionType | null) => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setActive(null);
      }}
      title="Choisir un mode de retrait"
      description="Sélectionnez la destination qui convient à votre demande."
    >
      <WithdrawChoice choose={setActive} />
    </Modal>
  );
}

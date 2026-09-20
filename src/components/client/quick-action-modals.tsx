"use client";

import { Building2, Smartphone } from "lucide-react";

import { KycRequiredModal } from "@/components/kyc/kyc-required-modal";
import { DepositRequestForm } from "@/components/operations/deposit-request-form";
import { GuaranteeWithdrawalReminderModal } from "@/components/operations/guarantee-withdrawal-reminder-modal";
import { RepaymentRequestForm } from "@/components/operations/repayment-request-form";
import { WithdrawalRequestForm } from "@/components/operations/withdrawal-request-form";
import { Modal } from "@/components/ui/modal";

import type { ActiveLoanState } from "@/lib/hooks/use-active-loan";

export type QuickActionType =
  | "deposit-savings"
  | "deposit-guarantee"
  | "withdraw"
  | "withdraw-momo"
  | "withdraw-bank"
  | "repay";

const DIALOG_COPY: Record<
  Exclude<QuickActionType, "withdraw">,
  { title: string; description: string }
> = {
  "deposit-savings": {
    title: "Déposer une épargne",
    description: "Effectuez votre dépôt Mobile Money puis confirmez avec votre PIN.",
  },
  "deposit-guarantee": {
    title: "Déposer une garantie de prêt",
    description: "Constituez la garantie de votre prêt pour débloquer immédiatement vos retraits.",
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
};

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

function ActionFormContent({
  action,
  remainingGuarantee,
  switchAction,
}: {
  action: Exclude<QuickActionType, "withdraw">;
  remainingGuarantee: number;
  switchAction: (action: QuickActionType) => void;
}) {
  if (action === "deposit-savings") {
    return (
      <DepositRequestForm key="deposit-savings" defaultMotif="FREE_SAVINGS" lockMotif={true} />
    );
  }
  if (action === "deposit-guarantee") {
    return (
      <DepositRequestForm
        key="deposit-guarantee"
        defaultMotif="GUARANTEE"
        lockMotif={true}
        defaultAmount={remainingGuarantee}
      />
    );
  }
  if (action === "withdraw-momo") {
    return (
      <WithdrawalRequestForm
        key="withdraw-momo"
        type="MOBILE_MONEY"
        onSwitchType={() => switchAction("withdraw-bank")}
      />
    );
  }
  if (action === "withdraw-bank") {
    return (
      <WithdrawalRequestForm
        key="withdraw-bank"
        type="BANK_TRANSFER"
        onSwitchType={() => switchAction("withdraw-momo")}
      />
    );
  }
  return <RepaymentRequestForm />;
}

function WithdrawalChoiceModal({
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

function OperationModal({
  active,
  remainingGuarantee,
  setActive,
}: {
  active: Exclude<QuickActionType, "withdraw"> | null;
  remainingGuarantee: number;
  setActive: (action: QuickActionType | null) => void;
}) {
  if (!active) return null;
  const copy = DIALOG_COPY[active];
  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) setActive(null);
      }}
      title={copy.title}
      description={copy.description}
    >
      <ActionFormContent
        action={active}
        remainingGuarantee={remainingGuarantee}
        switchAction={setActive}
      />
    </Modal>
  );
}

function extractModalLoanProps(loan?: ActiveLoanState) {
  if (!loan) {
    return {
      loanAmount: undefined,
      guaranteeRequired: 0,
      guaranteeBlocked: 0,
      remainingGuarantee: 0,
      freeSavings: 0,
      requestId: undefined,
    };
  }
  return {
    loanAmount: loan.totalAmount,
    guaranteeRequired: loan.guaranteeRequired ?? 0,
    guaranteeBlocked: loan.guaranteeBlocked ?? 0,
    remainingGuarantee: loan.remainingGuarantee ?? 0,
    freeSavings: loan.freeSavings ?? 0,
    requestId: loan.requestId,
  };
}

export function QuickActionModals({
  active,
  setActive,
  kycModalOpen,
  setKycModalOpen,
  guaranteeModalOpen,
  setGuaranteeModalOpen,
  kycStatus,
  loan,
}: {
  active: QuickActionType | null;
  setActive: (action: QuickActionType | null) => void;
  kycModalOpen: boolean;
  setKycModalOpen: (open: boolean) => void;
  guaranteeModalOpen: boolean;
  setGuaranteeModalOpen: (open: boolean) => void;
  kycStatus?: string;
  loan?: ActiveLoanState;
}) {
  const p = extractModalLoanProps(loan);
  const formAction = active !== "withdraw" ? active : null;

  return (
    <>
      <KycRequiredModal open={kycModalOpen} onOpenChange={setKycModalOpen} status={kycStatus} />

      <GuaranteeWithdrawalReminderModal
        open={guaranteeModalOpen}
        onOpenChange={setGuaranteeModalOpen}
        loanAmount={p.loanAmount}
        guaranteeRequired={p.guaranteeRequired}
        guaranteeBlocked={p.guaranteeBlocked}
        remainingGuarantee={p.remainingGuarantee}
        freeSavings={p.freeSavings}
        requestId={p.requestId}
        onProceedToDeposit={() => setActive("deposit-guarantee")}
      />

      <WithdrawalChoiceModal open={active === "withdraw"} setActive={setActive} />

      <OperationModal
        active={formAction}
        remainingGuarantee={p.remainingGuarantee}
        setActive={setActive}
      />
    </>
  );
}

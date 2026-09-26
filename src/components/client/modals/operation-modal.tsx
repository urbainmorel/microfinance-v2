"use client";

import { DepositRequestForm } from "@/components/operations/deposit-request-form";
import { RepaymentRequestForm } from "@/components/operations/repayment-request-form";
import { WithdrawalRequestForm } from "@/components/operations/withdrawal-request-form";
import { Modal } from "@/components/ui/modal";

import type { QuickActionType } from "./types";

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

export function OperationModal({
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

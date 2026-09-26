"use client";

import { OperationModal } from "@/components/client/modals/operation-modal";
import { WithdrawalChoiceModal } from "@/components/client/modals/withdrawal-choice-modal";
import { KycRequiredModal } from "@/components/kyc/kyc-required-modal";
import { GuaranteeWithdrawalReminderModal } from "@/components/operations/guarantee-withdrawal-reminder-modal";

import type { QuickActionType } from "./modals/types";
import type { ActiveLoanState } from "@/lib/hooks/use-active-loan";

export type { QuickActionType };

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

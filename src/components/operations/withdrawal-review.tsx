import { TransactionReview } from "@/components/operations/operation-form-fields";
import { formatFcfa } from "@/lib/format";

import type { WithdrawalRequestInput } from "@/lib/schemas/operations";

export function getWithdrawalRecipient(values: WithdrawalRequestInput) {
  if (values.type === "MOBILE_MONEY") {
    return { name: values.recipientName, operator: values.operator, phone: values.phone };
  }
  return {
    name: values.recipientName,
    bank: values.bank,
    bankCode: values.bankCode,
    account: values.account,
    country: values.country,
    iban: values.iban || null,
    motif: values.motif,
  };
}

function destinationLabel(values: WithdrawalRequestInput) {
  return values.type === "MOBILE_MONEY"
    ? [values.operator, values.phone].filter(Boolean).join(" · ")
    : [values.bank, values.bankCode, values.account].filter(Boolean).join(" · ");
}

export function WithdrawalReview({ values }: { values: WithdrawalRequestInput }) {
  const bank = values.type === "BANK_TRANSFER";
  return (
    <TransactionReview
      title={bank ? "Demande de virement" : "Demande de retrait"}
      amount={formatFcfa(Number(values.amount) || 0)}
      items={[
        { label: "Canal", value: bank ? "Virement bancaire" : "Mobile Money" },
        { label: "Bénéficiaire", value: values.recipientName },
        { label: "Destination", value: destinationLabel(values) },
        ...(bank
          ? [
              { label: "Pays", value: values.country },
              { label: "Motif", value: values.motif },
            ]
          : []),
      ]}
    />
  );
}

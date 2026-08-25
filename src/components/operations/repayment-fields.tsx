import { DocumentField } from "@/components/operations/document-field";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";
import { formatFcfa } from "@/lib/format";

import type { RepaymentRequestInput } from "@/lib/schemas/operations";
import type { UseFormReturn } from "react-hook-form";

const PAYMENT_OPTIONS = [
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "BANK_TRANSFER", label: "Virement bancaire" },
  { value: "CASH", label: "Espèces en agence" },
];

export type ActiveLoan = { id: string; total_amount: number; remaining_principal: number };

type RepaymentFieldsProps = {
  form: UseFormReturn<RepaymentRequestInput>;
  loans: ActiveLoan[];
  step: 0 | 1 | 2;
};

export function RepaymentFields({ form, loans, step }: RepaymentFieldsProps) {
  if (step === 0) return <RepaymentDetailsFields form={form} loans={loans} />;
  if (step === 1) return <RepaymentProofFields form={form} />;
  return <RepaymentPinField form={form} />;
}

function RepaymentDetailsFields({ form, loans }: Pick<RepaymentFieldsProps, "form" | "loans">) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <>
      <SelectField
        id="repayment-loan"
        label="Prêt à rembourser"
        placeholder="Sélectionner un prêt"
        options={loans.map((loan) => ({
          value: loan.id,
          label: `Capital restant : ${formatFcfa(loan.remaining_principal)}`,
        }))}
        error={errors.loanId?.message}
        {...register("loanId")}
      />
      <FormField
        id="repayment-amount"
        label="Montant (FCFA)"
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        error={errors.amount?.message}
        {...register("amount")}
      />
    </>
  );
}

function RepaymentProofFields({ form }: Pick<RepaymentFieldsProps, "form">) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const electronicPayment = watch("paymentMethod") !== "CASH";
  const proof = watch("proof");
  return (
    <>
      <SelectField
        id="repayment-method"
        label="Moyen de paiement"
        options={PAYMENT_OPTIONS}
        error={errors.paymentMethod?.message}
        {...register("paymentMethod")}
      />
      <FormField
        id="repayment-reference"
        label={`Référence du paiement${electronicPayment ? "" : " (facultatif)"}`}
        required={electronicPayment}
        autoComplete="off"
        error={errors.reference?.message}
        {...register("reference")}
      />
      <DocumentField
        id="repayment-proof"
        label="Justificatif du paiement"
        error={errors.proof?.message}
        selectedFiles={proof ? [proof] : []}
        onChange={(files) =>
          setValue("proof", files[0] as File, { shouldDirty: true, shouldValidate: true })
        }
      />
    </>
  );
}

function RepaymentPinField({ form }: Pick<RepaymentFieldsProps, "form">) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <FormField
      id="repayment-pin"
      label="Code PIN de confirmation"
      type="password"
      inputMode="numeric"
      autoComplete="current-password"
      maxLength={6}
      error={errors.pin?.message}
      {...register("pin")}
    />
  );
}

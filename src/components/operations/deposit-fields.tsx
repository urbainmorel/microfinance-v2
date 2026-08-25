import { DocumentField } from "@/components/operations/document-field";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";

import type { DepositRequestInput } from "@/lib/schemas/operations";
import type { UseFormReturn } from "react-hook-form";

const PAYMENT_OPTIONS = [
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "BANK_TRANSFER", label: "Virement bancaire" },
  { value: "CASH", label: "Espèces en agence" },
];

type DepositFieldsProps = {
  form: UseFormReturn<DepositRequestInput>;
  step: 0 | 1 | 2;
};

export function DepositFields({ form, step }: DepositFieldsProps) {
  if (step === 0) return <DepositDetailsFields form={form} />;
  if (step === 1) return <DepositProofFields form={form} />;
  return <DepositPinField form={form} />;
}

function DepositDetailsFields({ form }: Pick<DepositFieldsProps, "form">) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <>
      <FormField
        id="deposit-amount"
        label="Montant (FCFA)"
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        error={errors.amount?.message}
        {...register("amount")}
      />
      <SelectField
        id="deposit-motif"
        label="Destination du dépôt"
        options={[
          { value: "FREE_SAVINGS", label: "Épargne libre" },
          { value: "GUARANTEE", label: "Garantie de prêt" },
          { value: "REPAYMENT", label: "Remboursement" },
        ]}
        error={errors.motif?.message}
        {...register("motif")}
      />
    </>
  );
}

function DepositProofFields({ form }: Pick<DepositFieldsProps, "form">) {
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
        id="deposit-method"
        label="Moyen de paiement"
        options={PAYMENT_OPTIONS}
        error={errors.paymentMethod?.message}
        {...register("paymentMethod")}
      />
      <FormField
        id="deposit-reference"
        label={`Référence${electronicPayment ? "" : " (facultative)"}`}
        required={electronicPayment}
        autoComplete="off"
        error={errors.reference?.message}
        {...register("reference")}
      />
      <DocumentField
        id="deposit-proof"
        label="Justificatif du paiement"
        error={errors.proof?.message}
        selectedFiles={proof ? [proof] : []}
        onChange={(files) =>
          setValue("proof", files[0] as File, { shouldDirty: true, shouldValidate: true })
        }
      />
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-5" {...register("certified")} />
        <span>
          Je certifie que ce justificatif est authentique et correspond au paiement déclaré.
        </span>
      </label>
      {errors.certified ? (
        <p className="text-xs font-medium text-warning">{errors.certified.message}</p>
      ) : null}
    </>
  );
}

function DepositPinField({ form }: Pick<DepositFieldsProps, "form">) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <FormField
      id="deposit-pin"
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

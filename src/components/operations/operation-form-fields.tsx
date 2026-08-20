import Link from "next/link";

import { DocumentField } from "@/components/operations/document-field";
import { RecipientFields } from "@/components/operations/recipient-fields";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";
import { formatFcfa } from "@/lib/format";

import type {
  DepositRequestInput,
  RepaymentRequestInput,
  WithdrawalRequestInput,
} from "@/lib/schemas/operations";
import type { UseFormReturn } from "react-hook-form";

const PAYMENT_OPTIONS = [
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "BANK_TRANSFER", label: "Virement bancaire" },
  { value: "CASH", label: "Espèces en agence" },
];

export function DepositFields({ form }: { form: UseFormReturn<DepositRequestInput> }) {
  const {
    register,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const electronicPayment = watch("paymentMethod") !== "CASH";
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
      <Button type="submit" variant="accent" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? "Envoi en cours…" : "Envoyer la demande"}
      </Button>
    </>
  );
}

export function WithdrawalFields({
  form,
  isMomo,
}: {
  form: UseFormReturn<WithdrawalRequestInput>;
  isMomo: boolean;
}) {
  const {
    register,
    formState: { errors, isSubmitting },
  } = form;
  return (
    <>
      <input type="hidden" {...register("type")} />
      <FormField
        id="withdrawal-amount"
        label="Montant (FCFA)"
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        error={errors.amount?.message}
        {...register("amount")}
      />
      <FormField
        id="withdrawal-name"
        label="Nom complet du bénéficiaire"
        autoComplete="name"
        error={errors.recipientName?.message}
        {...register("recipientName")}
      />
      <RecipientFields form={form} isMomo={isMomo} />
      <FormField
        id="withdrawal-pin"
        label="Code PIN de confirmation"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        maxLength={6}
        error={errors.pin?.message}
        {...register("pin")}
      />
      <Button type="submit" variant="accent" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? "Envoi en cours…" : "Confirmer le retrait"}
      </Button>
    </>
  );
}

export type ActiveLoan = { id: string; total_amount: number; remaining_principal: number };

export function RepaymentFields({
  form,
  loans,
}: {
  form: UseFormReturn<RepaymentRequestInput>;
  loans: ActiveLoan[];
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const electronicPayment = watch("paymentMethod") !== "CASH";
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
        onChange={(files) =>
          setValue("proof", files[0] as File, { shouldDirty: true, shouldValidate: true })
        }
      />
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
      <Button type="submit" variant="accent" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? "Envoi en cours…" : "Envoyer le remboursement"}
      </Button>
    </>
  );
}

export function AlternateWithdrawalLink({ isMomo }: { isMomo: boolean }) {
  return (
    <Link
      href={isMomo ? "/client/withdraw/bank" : "/client/withdraw/momo"}
      className="min-h-11 text-center text-sm font-semibold text-accent"
    >
      {isMomo ? "Faire plutôt un virement bancaire" : "Faire plutôt un retrait Mobile Money"}
    </Link>
  );
}

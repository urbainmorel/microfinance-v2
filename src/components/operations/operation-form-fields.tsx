import Link from "next/link";

import { RecipientFields } from "@/components/operations/recipient-fields";
import { FormField } from "@/components/ui/form-field";

import type { WithdrawalRequestInput } from "@/lib/schemas/operations";
import type { UseFormReturn } from "react-hook-form";

export { DepositFields } from "@/components/operations/deposit-fields";
export { RepaymentFields } from "@/components/operations/repayment-fields";
export type { ActiveLoan } from "@/components/operations/repayment-fields";

export type TransactionFormStep = 0 | 1 | 2;

export function WithdrawalFields({
  form,
  isMomo,
  step,
}: {
  form: UseFormReturn<WithdrawalRequestInput>;
  isMomo: boolean;
  step: TransactionFormStep;
}) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <>
      <input type="hidden" {...register("type")} />
      {step === 0 ? (
        <>
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
        </>
      ) : null}
      {step === 1 ? <RecipientFields form={form} isMomo={isMomo} /> : null}
      {step === 2 ? (
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
      ) : null}
    </>
  );
}

export function TransactionReview({
  title,
  amount,
  items,
}: {
  title: string;
  amount: string;
  items: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-muted/60 p-4" aria-label={title}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{amount}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5 break-words text-sm font-semibold text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function AlternateWithdrawalLink({
  isMomo,
  onSwitch,
}: {
  isMomo: boolean;
  onSwitch?: () => void;
}) {
  const label = isMomo
    ? "Faire plutôt un virement bancaire"
    : "Faire plutôt un retrait Mobile Money";
  if (onSwitch) {
    return (
      <button
        type="button"
        onClick={onSwitch}
        className="min-h-11 text-center text-sm font-semibold text-accent"
      >
        {label}
      </button>
    );
  }
  return (
    <Link
      href={isMomo ? "/client/withdraw/bank" : "/client/withdraw/momo"}
      className="min-h-11 text-center text-sm font-semibold text-accent"
    >
      {label}
    </Link>
  );
}

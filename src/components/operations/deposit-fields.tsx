import { Smartphone } from "lucide-react";

import { DocumentField } from "@/components/operations/document-field";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";

import type { DepositRequestInput } from "@/lib/schemas/operations";
import type { UseFormReturn } from "react-hook-form";

type DepositFieldsProps = {
  form: UseFormReturn<DepositRequestInput>;
  step: 0 | 1 | 2;
  lockMotif?: boolean;
};

export function DepositFields({ form, step, lockMotif }: DepositFieldsProps) {
  if (step === 0) return <DepositDetailsFields form={form} lockMotif={lockMotif} />;
  if (step === 1) return <DepositProofFields form={form} />;
  return <DepositPinField form={form} />;
}

function DepositDetailsFields({ form, lockMotif }: Pick<DepositFieldsProps, "form" | "lockMotif">) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const currentMotif = watch("motif");

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
      {lockMotif ? (
        <div>
          <input type="hidden" {...register("motif")} />
          <p className="text-xs font-semibold text-muted-foreground">Destination du dépôt</p>
          <div className="mt-1.5 flex h-11 items-center rounded-xl border border-border bg-muted/60 px-3.5 text-sm font-semibold text-foreground">
            {currentMotif === "GUARANTEE"
              ? "Garantie de prêt (100% remboursable)"
              : "Épargne libre"}
          </div>
        </div>
      ) : (
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
      )}
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
  const proof = watch("proof");

  return (
    <>
      <input type="hidden" value="MOBILE_MONEY" {...register("paymentMethod")} />

      <div className="rounded-xl border border-accent/25 bg-finance-soft/40 p-3.5 text-xs leading-5 text-foreground">
        <div className="flex items-center gap-2 font-semibold text-accent">
          <Smartphone className="size-4 shrink-0" aria-hidden />
          Dépôt exclusif par Mobile Money (Wave, MTN, Orange, Moov)
        </div>
        <p className="mt-1 text-muted-foreground">
          Effectuez votre transfert puis joignez ci-dessous la capture d’écran de confirmation.
        </p>
      </div>

      <FormField
        id="deposit-reference"
        label="Référence / ID de transaction Mobile Money"
        required
        autoComplete="off"
        placeholder="Ex: PP240911.1234.A01234 ou CI2409..."
        error={errors.reference?.message}
        {...register("reference")}
      />

      <div>
        <DocumentField
          id="deposit-proof"
          label="Preuve de dépôt mobile (Capture d’écran du message complet)"
          error={errors.proof?.message}
          selectedFiles={proof ? [proof] : []}
          onChange={(files) =>
            setValue("proof", files[0] as File, { shouldDirty: true, shouldValidate: true })
          }
        />
        <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
          La capture doit montrer le message de confirmation complet : numéro mobile expéditeur,
          montant exact, référence et heure de transaction.
        </p>
      </div>

      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-5" {...register("certified")} />
        <span>
          Je certifie que cette capture correspond fidèlement au transfert Mobile Money effectué.
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
      {...register("pin", {
        onChange: () => {
          if (errors.pin) form.clearErrors("pin");
        },
      })}
    />
  );
}

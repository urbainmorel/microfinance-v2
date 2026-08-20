import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";

import type { WithdrawalRequestInput } from "@/lib/schemas/operations";
import type { UseFormReturn } from "react-hook-form";

const UMOA_COUNTRIES = [
  { value: "BJ", label: "Bénin" },
  { value: "BF", label: "Burkina Faso" },
  { value: "CI", label: "Côte d’Ivoire" },
  { value: "GW", label: "Guinée-Bissau" },
  { value: "ML", label: "Mali" },
  { value: "NE", label: "Niger" },
  { value: "SN", label: "Sénégal" },
  { value: "TG", label: "Togo" },
];

export function RecipientFields({
  form,
  isMomo,
}: {
  form: UseFormReturn<WithdrawalRequestInput>;
  isMomo: boolean;
}) {
  return isMomo ? <MobileMoneyFields form={form} /> : <BankFields form={form} />;
}

function MobileMoneyFields({ form }: { form: UseFormReturn<WithdrawalRequestInput> }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <>
      <SelectField
        id="withdrawal-operator"
        label="Opérateur Mobile Money"
        placeholder="Choisir un opérateur"
        options={[
          { value: "MTN", label: "MTN Mobile Money" },
          { value: "MOOV", label: "Moov Money" },
          { value: "ORANGE", label: "Orange Money" },
          { value: "WAVE", label: "Wave" },
        ]}
        error={errors.operator?.message}
        {...register("operator")}
      />
      <FormField
        id="withdrawal-phone"
        label="Numéro Mobile Money"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register("phone")}
      />
    </>
  );
}

function BankFields({ form }: { form: UseFormReturn<WithdrawalRequestInput> }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <>
      <SelectField
        id="withdrawal-country"
        label="Pays du compte (UMOA)"
        options={UMOA_COUNTRIES}
        error={errors.country?.message}
        {...register("country")}
      />
      <FormField
        id="withdrawal-bank"
        label="Banque du bénéficiaire"
        autoComplete="organization"
        error={errors.bank?.message}
        {...register("bank")}
      />
      <FormField
        id="withdrawal-bank-code"
        label="Code banque"
        autoComplete="off"
        error={errors.bankCode?.message}
        {...register("bankCode")}
      />
      <FormField
        id="withdrawal-account"
        label="Numéro de compte"
        autoComplete="off"
        error={errors.account?.message}
        {...register("account")}
      />
      <FormField
        id="withdrawal-iban"
        label="IBAN (si applicable)"
        autoComplete="off"
        error={errors.iban?.message}
        {...register("iban")}
      />
      <FormField
        id="withdrawal-motif"
        label="Motif du virement"
        autoComplete="off"
        error={errors.motif?.message}
        {...register("motif")}
      />
    </>
  );
}

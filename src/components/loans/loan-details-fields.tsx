import { DocumentField } from "@/components/operations/document-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";

import type { LoanRequestInput } from "@/lib/schemas/loan";
import type { UseFormReturn } from "react-hook-form";

function PurposeField({ form }: { form: UseFormReturn<LoanRequestInput> }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="loan-purpose" className="text-xs font-semibold text-muted-foreground">
        Objet du prêt
      </label>
      <textarea
        id="loan-purpose"
        rows={4}
        className="w-full rounded-[14px] border border-border bg-card px-4 py-3 text-base text-foreground focus-visible:border-ring focus-visible:outline-none"
        aria-invalid={Boolean(errors.purpose)}
        aria-describedby={errors.purpose ? "loan-purpose-error" : undefined}
        {...register("purpose")}
      />
      {errors.purpose ? (
        <p id="loan-purpose-error" className="text-xs font-medium text-warning">
          {errors.purpose.message}
        </p>
      ) : null}
    </div>
  );
}

function TermsField({ form }: { form: UseFormReturn<LoanRequestInput> }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-5 rounded border-border accent-[hsl(var(--accent))]"
          {...register("acceptedTerms")}
        />
        <span>J’accepte les conditions du produit et l’échéancier présenté.</span>
      </label>
      {errors.acceptedTerms ? (
        <p className="mt-1 text-xs font-medium text-warning">{errors.acceptedTerms.message}</p>
      ) : null}
    </div>
  );
}

export function LoanDetailsFields({
  form,
  simulationIsFresh,
}: {
  form: UseFormReturn<LoanRequestInput>;
  simulationIsFresh: boolean;
}) {
  const {
    register,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-foreground">Votre demande</h2>
      <PurposeField form={form} />
      <FormField
        id="loan-income"
        label="Revenu mensuel estimé (FCFA)"
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        error={errors.monthlyIncomeEstimate?.message}
        {...register("monthlyIncomeEstimate")}
      />
      <SelectField
        id="loan-disbursement"
        label="Mode de décaissement souhaité"
        options={[
          { value: "INTERNAL", label: "Portefeuille interne" },
          { value: "MOBILE_MONEY", label: "Mobile Money" },
          { value: "BANK_TRANSFER", label: "Virement bancaire" },
        ]}
        error={errors.disbursementMethod?.message}
        {...register("disbursementMethod")}
      />
      <DocumentField
        id="loan-documents"
        label="Justificatifs de la demande (1 à 5)"
        multiple
        error={errors.documents?.message}
        onChange={(files) =>
          setValue("documents", files, { shouldDirty: true, shouldValidate: true })
        }
      />
      <TermsField form={form} />
      <FormField
        id="loan-pin"
        label="Code PIN de confirmation"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        maxLength={6}
        error={errors.pin?.message}
        {...register("pin")}
      />
      <Button
        type="submit"
        variant="accent"
        disabled={isSubmitting || !simulationIsFresh}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Envoi en cours…" : "Soumettre ma demande"}
      </Button>
      {!simulationIsFresh ? (
        <p className="text-center text-xs text-muted-foreground">
          Une simulation à jour est requise avant l’envoi.
        </p>
      ) : null}
    </Card>
  );
}

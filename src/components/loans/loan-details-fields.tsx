import { ArrowLeft, ShieldCheck } from "lucide-react";

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

function RequestInformationFields({ form }: { form: UseFormReturn<LoanRequestInput> }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <>
      <PurposeField form={form} />
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
    </>
  );
}

function ConfirmationFields({ form }: { form: UseFormReturn<LoanRequestInput> }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="rounded-2xl border border-border bg-muted/35 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
          <ShieldCheck className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Confirmation sécurisée</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Vérifiez les conditions puis utilisez votre code PIN pour signer la demande.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4">
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
      </div>
    </div>
  );
}

function FormActions({
  isSubmitting,
  simulationIsFresh,
  onBack,
}: {
  isSubmitting: boolean;
  simulationIsFresh: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
      <Button type="button" variant="outline" onClick={onBack}>
        <ArrowLeft aria-hidden /> Retour
      </Button>
      <Button
        type="submit"
        variant="accent"
        disabled={isSubmitting || !simulationIsFresh}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Envoi en cours…" : "Soumettre ma demande"}
      </Button>
    </div>
  );
}

export function LoanDetailsFields({
  form,
  simulationIsFresh,
  onBack,
}: {
  form: UseFormReturn<LoanRequestInput>;
  simulationIsFresh: boolean;
  onBack: () => void;
}) {
  const { setValue, watch, formState } = form;
  return (
    <Card className="flex flex-col gap-5 border-border bg-card p-5 shadow-none sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Étape 3</p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
          Finalisez votre dossier
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Ajoutez les informations utiles, vos justificatifs et confirmez avec votre PIN.
        </p>
      </div>
      <RequestInformationFields form={form} />
      <DocumentField
        id="loan-documents"
        label="Justificatifs de la demande (1 à 5)"
        multiple
        error={formState.errors.documents?.message}
        selectedFiles={watch("documents")}
        onChange={(files) =>
          setValue("documents", files, { shouldDirty: true, shouldValidate: true })
        }
      />
      <ConfirmationFields form={form} />
      <FormActions
        isSubmitting={formState.isSubmitting}
        simulationIsFresh={simulationIsFresh}
        onBack={onBack}
      />
      {!simulationIsFresh ? (
        <p className="text-center text-xs text-muted-foreground">
          Une simulation à jour est requise avant l’envoi.
        </p>
      ) : null}
    </Card>
  );
}

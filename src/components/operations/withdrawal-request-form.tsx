"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/auth/form-error";
import { RequestSuccess } from "@/components/client/request-page-shell";
import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import {
  AlternateWithdrawalLink,
  WithdrawalFields,
  type TransactionFormStep,
} from "@/components/operations/operation-form-fields";
import {
  checkWithdrawalGuarantee,
  extractGuaranteeState,
  GuaranteeBlockedWithdrawalNotice,
  LoanGuaranteeReserveWarning,
} from "@/components/operations/withdrawal-guarantee-notice";
import {
  getWithdrawalRecipient,
  WithdrawalReview,
} from "@/components/operations/withdrawal-review";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormStepper } from "@/components/ui/form-stepper";
import { ClientCommandError, invokeClientCommand } from "@/lib/client-command";
import { useActiveLoan } from "@/lib/hooks/use-active-loan";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { withdrawalRequestSchema, type WithdrawalRequestInput } from "@/lib/schemas/operations";

import type { UseFormReturn } from "react-hook-form";

const WITHDRAWAL_STEPS = [
  { label: "Montant", description: "Somme et bénéficiaire" },
  { label: "Destination", description: "Coordonnées de réception" },
  { label: "Confirmation", description: "Vérification par PIN" },
] as const;

function StepActions({
  step,
  busy,
  back,
  next,
}: {
  step: TransactionFormStep;
  busy: boolean;
  back: () => void;
  next: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
      {step > 0 ? (
        <Button type="button" variant="ghost" onClick={back} disabled={busy}>
          Retour
        </Button>
      ) : (
        <span />
      )}
      {step < 2 ? (
        <Button type="button" variant="accent" onClick={next}>
          Continuer
        </Button>
      ) : (
        <Button type="submit" variant="accent" disabled={busy} aria-busy={busy}>
          {busy ? "Envoi en cours…" : "Confirmer la demande"}
        </Button>
      )}
    </div>
  );
}

function WithdrawalWizard({
  form,
  isMomo,
  onSwitchType,
  serverError,
  submit,
}: {
  form: UseFormReturn<WithdrawalRequestInput>;
  isMomo: boolean;
  onSwitchType?: () => void;
  serverError: string | null;
  submit: (values: WithdrawalRequestInput) => Promise<void>;
}) {
  const [step, setStep] = useState<TransactionFormStep>(0);

  async function next() {
    let valid: boolean;
    if (step === 0) {
      valid = await form.trigger(["type", "amount", "recipientName"], { shouldFocus: true });
    } else {
      const fields = isMomo
        ? (["operator", "phone"] as const)
        : (["country", "bank", "bankCode", "account", "iban", "motif"] as const);
      valid = await form.trigger(fields, { shouldFocus: true });
    }
    if (valid) setStep(step === 0 ? 1 : 2);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (step < 2) {
      event.preventDefault();
      void next();
      return;
    }
    void form.handleSubmit(submit)(event);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
        {isMomo
          ? "Traitement par un agent entre 8 h et 19 h. Le montant est réservé dès l’envoi."
          : "Exécution sous 24 à 48 heures ouvrées. Le montant est réservé dès l’envoi."}
      </div>
      <FormStepper steps={WITHDRAWAL_STEPS} currentStep={step} />
      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleFormSubmit} noValidate>
          <FormError message={serverError} />
          {step === 2 ? <WithdrawalReview values={form.getValues()} /> : null}
          <WithdrawalFields form={form} isMomo={isMomo} step={step} />
          <StepActions
            step={step}
            busy={form.formState.isSubmitting}
            back={() => setStep((step - 1) as TransactionFormStep)}
            next={() => void next()}
          />
        </form>
      </Card>
      <AlternateWithdrawalLink isMomo={isMomo} onSwitch={onSwitchType} />
    </div>
  );
}

function WithdrawalFormContainer({
  form,
  isMomo,
  hasPendingGuarantee,
  withdrawableAmount,
  totalAmount,
  remainingGuarantee,
  serverError,
  onSwitchType,
  submit,
}: {
  form: UseFormReturn<WithdrawalRequestInput>;
  isMomo: boolean;
  hasPendingGuarantee: boolean;
  withdrawableAmount: number;
  totalAmount: number;
  remainingGuarantee: number;
  serverError: string | null;
  onSwitchType?: () => void;
  submit: (values: WithdrawalRequestInput) => Promise<void>;
}) {
  const showWarning = hasPendingGuarantee && withdrawableAmount > 0;
  return (
    <div className="flex flex-col gap-4">
      {showWarning ? (
        <LoanGuaranteeReserveWarning
          withdrawableAmount={withdrawableAmount}
          totalAmount={totalAmount}
          remainingGuarantee={remainingGuarantee}
        />
      ) : null}
      <WithdrawalWizard
        form={form}
        isMomo={isMomo}
        onSwitchType={onSwitchType}
        serverError={serverError}
        submit={submit}
      />
    </div>
  );
}

function useWithdrawalAction(
  hasPendingGuarantee: boolean,
  withdrawableAmount: number,
  remainingGuarantee: number,
  form?: UseFormReturn<WithdrawalRequestInput>,
) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const runIdempotent = useIdempotentCommand();
  const [serverError, setServerError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const submit = async (values: WithdrawalRequestInput) => {
    setServerError(null);
    form?.clearErrors("pin");
    const guaranteeErr = checkWithdrawalGuarantee(
      hasPendingGuarantee,
      Number(values.amount),
      withdrawableAmount,
      remainingGuarantee,
    );
    if (guaranteeErr) {
      setServerError(guaranteeErr);
      return;
    }

    const target = getWithdrawalRecipient(values);
    const fingerprint = JSON.stringify({
      type: values.type,
      amount: values.amount,
      recipient: target,
    });
    try {
      const result = await runIdempotent(fingerprint, (key) =>
        invokeClientCommand(supabase, {
          action: "withdrawal.create",
          pin: values.pin,
          idempotencyKey: key,
          payload: { type: values.type, amount: values.amount, recipient: target },
        }),
      );
      if (result) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["client-operations"] }),
          queryClient.invalidateQueries({ queryKey: ["wallet"] }),
          queryClient.invalidateQueries({ queryKey: ["active-loan-status"] }),
        ]);
        setRequestId(result.id);
      }
    } catch (error) {
      if (error instanceof ClientCommandError && error.code === "PIN_INVALID") {
        form?.setError("pin", {
          type: "server",
          message: "Code PIN incorrect. Veuillez vérifier votre saisie.",
        });
        setServerError(null);
      } else if (error instanceof ClientCommandError && error.code === "PIN_LOCKED") {
        form?.setError("pin", {
          type: "server",
          message: "Code PIN temporairement bloqué suite à trop de tentatives.",
        });
        setServerError(null);
      } else {
        setServerError(
          error instanceof Error ? error.message : "Le retrait n’a pas pu être envoyé.",
        );
      }
    }
  };

  return { serverError, requestId, submit };
}

export function WithdrawalRequestForm({
  type,
  onSwitchType,
}: {
  type: "MOBILE_MONEY" | "BANK_TRANSFER";
  onSwitchType?: () => void;
}) {
  const { data: loan } = useActiveLoan();
  const g = extractGuaranteeState(loan);
  const form = useForm<WithdrawalRequestInput>({
    resolver: zodResolver(withdrawalRequestSchema),
    defaultValues: { type, country: "CI", iban: "", motif: "" },
  });
  const { serverError, requestId, submit } = useWithdrawalAction(
    g.hasPendingGuarantee,
    g.withdrawableAmount,
    g.remainingGuarantee,
    form,
  );

  if (requestId) return <RequestSuccess title="Demande de retrait envoyée" reference={requestId} />;

  if (g.hasPendingGuarantee) {
    return <GuaranteeBlockedWithdrawalNotice remainingGuarantee={g.remainingGuarantee} />;
  }

  return (
    <WithdrawalFormContainer
      form={form}
      isMomo={type === "MOBILE_MONEY"}
      hasPendingGuarantee={g.hasPendingGuarantee}
      withdrawableAmount={g.withdrawableAmount}
      totalAmount={g.totalAmount}
      remainingGuarantee={g.remainingGuarantee}
      serverError={serverError}
      onSwitchType={onSwitchType}
      submit={submit}
    />
  );
}

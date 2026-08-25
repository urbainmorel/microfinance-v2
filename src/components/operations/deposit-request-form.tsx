"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/auth/form-error";
import { RequestSuccess } from "@/components/client/request-page-shell";
import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import {
  DepositFields,
  TransactionReview,
  type TransactionFormStep,
} from "@/components/operations/operation-form-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormStepper } from "@/components/ui/form-stepper";
import {
  ClientCommandError,
  getAuthenticatedUserId,
  invokeClientCommand,
  uploadClientDocument,
} from "@/lib/client-command";
import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { depositRequestSchema, type DepositRequestInput } from "@/lib/schemas/operations";

import type { UseFormReturn } from "react-hook-form";

type PendingProof = { fingerprint: string; path: string };

const DEPOSIT_STEPS = [
  { label: "Dépôt", description: "Montant et destination" },
  { label: "Justificatif", description: "Paiement et preuve" },
  { label: "Confirmation", description: "Vérification par PIN" },
] as const;

const MOTIF_LABELS: Record<DepositRequestInput["motif"], string> = {
  FREE_SAVINGS: "Épargne libre",
  GUARANTEE: "Garantie de prêt",
  REPAYMENT: "Remboursement",
};

const PAYMENT_LABELS: Record<DepositRequestInput["paymentMethod"], string> = {
  BANK_TRANSFER: "Virement bancaire",
  CASH: "Espèces en agence",
  MOBILE_MONEY: "Mobile Money",
};

function depositFingerprint(values: DepositRequestInput) {
  return JSON.stringify({
    amount: values.amount,
    motif: values.motif,
    paymentMethod: values.paymentMethod,
    reference: values.reference || null,
    proof: [values.proof.name, values.proof.size, values.proof.lastModified],
  });
}

function DepositReview({ values }: { values: DepositRequestInput }) {
  return (
    <TransactionReview
      title="Demande de dépôt"
      amount={formatFcfa(Number(values.amount) || 0)}
      items={[
        { label: "Destination", value: MOTIF_LABELS[values.motif] },
        { label: "Paiement", value: PAYMENT_LABELS[values.paymentMethod] },
        { label: "Référence", value: values.reference || "Non requise" },
        { label: "Justificatif", value: values.proof?.name ?? "Sélectionné" },
      ]}
    />
  );
}

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
          {busy ? "Envoi en cours…" : "Confirmer le dépôt"}
        </Button>
      )}
    </div>
  );
}

function DepositWizard({
  form,
  serverError,
  submit,
}: {
  form: UseFormReturn<DepositRequestInput>;
  serverError: string | null;
  submit: (values: DepositRequestInput) => Promise<void>;
}) {
  const [step, setStep] = useState<TransactionFormStep>(0);

  async function next() {
    const valid =
      step === 0
        ? await form.trigger(["amount", "motif"], { shouldFocus: true })
        : await form.trigger(["paymentMethod", "reference", "proof", "certified"], {
            shouldFocus: true,
          });
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
      <FormStepper steps={DEPOSIT_STEPS} currentStep={step} />
      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleFormSubmit} noValidate>
          <FormError message={serverError} />
          {step === 2 ? <DepositReview values={form.getValues()} /> : null}
          <DepositFields form={form} step={step} />
          <StepActions
            step={step}
            busy={form.formState.isSubmitting}
            back={() => setStep((step - 1) as TransactionFormStep)}
            next={() => void next()}
          />
        </form>
      </Card>
    </div>
  );
}

export function DepositRequestForm() {
  const supabase = useSupabase();
  const runIdempotent = useIdempotentCommand();
  const [serverError, setServerError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pendingProof, setPendingProof] = useState<PendingProof | null>(null);
  const form = useForm<DepositRequestInput>({
    resolver: zodResolver(depositRequestSchema),
    defaultValues: {
      certified: false,
      motif: "FREE_SAVINGS",
      paymentMethod: "MOBILE_MONEY",
      reference: "",
    },
  });

  async function submit(values: DepositRequestInput) {
    setServerError(null);
    const fingerprint = depositFingerprint(values);
    try {
      const result = await runIdempotent(fingerprint, async (key) => {
        const userId = await getAuthenticatedUserId(supabase);
        const proofPath =
          pendingProof?.fingerprint === fingerprint
            ? pendingProof.path
            : await uploadClientDocument(supabase, "deposit-proofs", userId, values.proof);
        setPendingProof({ fingerprint, path: proofPath });
        try {
          return await invokeClientCommand(supabase, {
            action: "deposit.create",
            pin: values.pin,
            idempotencyKey: key,
            payload: {
              amount: values.amount,
              motif: values.motif,
              paymentMethod: values.paymentMethod,
              reference: values.reference || null,
              proofPath,
            },
          });
        } catch (error) {
          if (error instanceof ClientCommandError && error.code) {
            await supabase.storage.from("deposit-proofs").remove([proofPath]);
            setPendingProof(null);
          }
          throw error;
        }
      });
      if (result) setRequestId(result.id);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Le dépôt n’a pas pu être envoyé.");
    }
  }

  if (requestId) return <RequestSuccess title="Demande de dépôt envoyée" reference={requestId} />;
  return <DepositWizard form={form} serverError={serverError} submit={submit} />;
}

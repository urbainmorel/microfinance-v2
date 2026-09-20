"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
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
  lockMotif,
  serverError,
  submit,
}: {
  form: UseFormReturn<DepositRequestInput>;
  lockMotif?: boolean;
  serverError: string | null;
  submit: (values: DepositRequestInput) => Promise<void>;
}) {
  const [step, setStep] = useState<TransactionFormStep>(0);
  const isGuarantee = form.watch("motif") === "GUARANTEE";

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
      {isGuarantee ? (
        <div className="shadow-xs flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
              La garantie est remboursée à 100% à la fin du remboursement du prêt.
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ce dépôt débloque vos retraits et vous sera intégralement reversé dès que votre crédit
              sera soldé.
            </p>
          </div>
        </div>
      ) : null}
      <FormStepper steps={DEPOSIT_STEPS} currentStep={step} />
      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleFormSubmit} noValidate>
          <FormError message={serverError} />
          {step === 2 ? <DepositReview values={form.getValues()} /> : null}
          <DepositFields form={form} step={step} lockMotif={lockMotif} />
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

function handleDepositPinError(
  error: unknown,
  form: UseFormReturn<DepositRequestInput>,
  setServerError: (msg: string | null) => void,
) {
  if (error instanceof ClientCommandError && error.code === "PIN_INVALID") {
    form.setError("pin", {
      type: "server",
      message: "Code PIN incorrect. Veuillez vérifier votre saisie.",
    });
    setServerError(null);
  } else if (error instanceof ClientCommandError && error.code === "PIN_LOCKED") {
    form.setError("pin", {
      type: "server",
      message: "Code PIN temporairement bloqué suite à trop de tentatives.",
    });
    setServerError(null);
  } else {
    setServerError(error instanceof Error ? error.message : "Le dépôt n’a pas pu être envoyé.");
  }
}

export function DepositRequestForm({
  defaultMotif = "FREE_SAVINGS",
  lockMotif = false,
  defaultAmount,
}: {
  defaultMotif?: "FREE_SAVINGS" | "GUARANTEE" | "REPAYMENT";
  lockMotif?: boolean;
  defaultAmount?: number;
} = {}) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const runIdempotent = useIdempotentCommand();
  const [serverError, setServerError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pendingProof, setPendingProof] = useState<PendingProof | null>(null);
  const form = useForm<DepositRequestInput>({
    resolver: zodResolver(depositRequestSchema),
    defaultValues: {
      amount: defaultAmount,
      certified: false,
      motif: defaultMotif,
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
      if (result) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["client-operations"] }),
          queryClient.invalidateQueries({ queryKey: ["wallet"] }),
          queryClient.invalidateQueries({ queryKey: ["active-loan-status"] }),
        ]);
        setRequestId(result.id);
      }
    } catch (error) {
      handleDepositPinError(error, form, setServerError);
    }
  }

  if (requestId) return <RequestSuccess title="Demande de dépôt envoyée" reference={requestId} />;
  return (
    <DepositWizard form={form} lockMotif={lockMotif} serverError={serverError} submit={submit} />
  );
}

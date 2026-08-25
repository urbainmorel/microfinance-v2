"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { HandCoins } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/auth/form-error";
import { RequestSuccess } from "@/components/client/request-page-shell";
import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import {
  RepaymentFields,
  TransactionReview,
  type ActiveLoan,
  type TransactionFormStep,
} from "@/components/operations/operation-form-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormStepper } from "@/components/ui/form-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClientCommandError,
  getAuthenticatedUserId,
  invokeClientCommand,
  uploadClientDocument,
} from "@/lib/client-command";
import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { repaymentRequestSchema, type RepaymentRequestInput } from "@/lib/schemas/operations";
import { cn } from "@/lib/utils";

import type { UseFormReturn } from "react-hook-form";

type PendingProof = { fingerprint: string; path: string };

const REPAYMENT_STEPS = [
  { label: "Remboursement", description: "Prêt et montant" },
  { label: "Justificatif", description: "Paiement et preuve" },
  { label: "Confirmation", description: "Vérification par PIN" },
] as const;

const PAYMENT_LABELS: Record<RepaymentRequestInput["paymentMethod"], string> = {
  BANK_TRANSFER: "Virement bancaire",
  CASH: "Espèces en agence",
  MOBILE_MONEY: "Mobile Money",
};

function useActiveLoans() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["active-loans-for-repayment"],
    queryFn: async (): Promise<ActiveLoan[]> => {
      const { data, error } = await supabase
        .from("loans")
        .select("id,total_amount,remaining_principal")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActiveLoan[];
    },
  });
}

function Unavailable({ retry }: { retry?: () => void }) {
  if (retry)
    return (
      <div className="flex flex-col gap-3">
        <FormError message="Impossible de charger vos prêts actifs." />
        <Button variant="outline" onClick={retry}>
          Réessayer
        </Button>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <EmptyState
        icon={HandCoins}
        title="Aucun prêt actif"
        hint="Une demande de remboursement nécessite un prêt en cours."
      />
      <Link href="/client/loans" className={cn(buttonVariants({ variant: "accent" }), "w-full")}>
        Voir les offres de prêt
      </Link>
    </div>
  );
}

function repaymentFingerprint(values: RepaymentRequestInput) {
  return JSON.stringify({
    loanId: values.loanId,
    amount: values.amount,
    paymentMethod: values.paymentMethod,
    reference: values.reference || null,
    proof: [values.proof.name, values.proof.size, values.proof.lastModified],
  });
}

function RepaymentReview({
  values,
  loans,
}: {
  values: RepaymentRequestInput;
  loans: ActiveLoan[];
}) {
  const loan = loans.find((item) => item.id === values.loanId);
  return (
    <TransactionReview
      title="Demande de remboursement"
      amount={formatFcfa(Number(values.amount) || 0)}
      items={[
        {
          label: "Prêt sélectionné",
          value: loan ? `Capital restant : ${formatFcfa(loan.remaining_principal)}` : values.loanId,
        },
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
          {busy ? "Envoi en cours…" : "Confirmer le remboursement"}
        </Button>
      )}
    </div>
  );
}

function RepaymentWizard({
  form,
  loans,
  serverError,
  submit,
}: {
  form: UseFormReturn<RepaymentRequestInput>;
  loans: ActiveLoan[];
  serverError: string | null;
  submit: (values: RepaymentRequestInput) => Promise<void>;
}) {
  const [step, setStep] = useState<TransactionFormStep>(0);

  async function next() {
    const valid =
      step === 0
        ? await form.trigger(["loanId", "amount"], { shouldFocus: true })
        : await form.trigger(["paymentMethod", "reference", "proof"], { shouldFocus: true });
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
      <FormStepper steps={REPAYMENT_STEPS} currentStep={step} />
      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleFormSubmit} noValidate>
          <FormError message={serverError} />
          {step === 2 ? <RepaymentReview values={form.getValues()} loans={loans} /> : null}
          <RepaymentFields form={form} loans={loans} step={step} />
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

export function RepaymentRequestForm() {
  const supabase = useSupabase();
  const loans = useActiveLoans();
  const runIdempotent = useIdempotentCommand();
  const [serverError, setServerError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pendingProof, setPendingProof] = useState<PendingProof | null>(null);
  const form = useForm<RepaymentRequestInput>({
    resolver: zodResolver(repaymentRequestSchema),
    defaultValues: { paymentMethod: "MOBILE_MONEY", reference: "" },
  });

  async function submit(values: RepaymentRequestInput) {
    setServerError(null);
    const fingerprint = repaymentFingerprint(values);
    try {
      const result = await runIdempotent(fingerprint, async (key) => {
        const userId = await getAuthenticatedUserId(supabase);
        const proofPath =
          pendingProof?.fingerprint === fingerprint
            ? pendingProof.path
            : await uploadClientDocument(supabase, "repayment-proofs", userId, values.proof);
        setPendingProof({ fingerprint, path: proofPath });
        try {
          return await invokeClientCommand(supabase, {
            action: "repayment.create",
            pin: values.pin,
            idempotencyKey: key,
            payload: {
              loanId: values.loanId,
              amount: values.amount,
              paymentMethod: values.paymentMethod,
              proofPath,
              reference: values.reference || null,
            },
          });
        } catch (error) {
          if (error instanceof ClientCommandError && error.code) {
            await supabase.storage.from("repayment-proofs").remove([proofPath]);
            setPendingProof(null);
          }
          throw error;
        }
      });
      if (result) setRequestId(result.id);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Le remboursement n’a pas pu être envoyé.",
      );
    }
  }

  if (loans.isPending) return <Skeleton className="h-[420px] w-full rounded-2xl" />;
  if (loans.isError) return <Unavailable retry={() => void loans.refetch()} />;
  if (!loans.data?.length) return <Unavailable />;
  if (requestId)
    return <RequestSuccess title="Demande de remboursement envoyée" reference={requestId} />;
  return (
    <RepaymentWizard form={form} loans={loans.data} serverError={serverError} submit={submit} />
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/auth/form-error";
import { RequestSuccess } from "@/components/client/request-page-shell";
import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import { DepositFields } from "@/components/operations/operation-form-fields";
import { Card } from "@/components/ui/card";
import {
  ClientCommandError,
  getAuthenticatedUserId,
  invokeClientCommand,
  uploadClientDocument,
} from "@/lib/client-command";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { depositRequestSchema, type DepositRequestInput } from "@/lib/schemas/operations";

type PendingProof = { fingerprint: string; path: string };

function depositFingerprint(values: DepositRequestInput) {
  return JSON.stringify({
    amount: values.amount,
    motif: values.motif,
    paymentMethod: values.paymentMethod,
    reference: values.reference || null,
    proof: [values.proof.name, values.proof.size, values.proof.lastModified],
  });
}

export function DepositRequestForm() {
  const supabase = useSupabase();
  const runIdempotent = useIdempotentCommand();
  const [serverError, setServerError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pendingProof, setPendingProof] = useState<PendingProof | null>(null);
  const form = useForm<DepositRequestInput>({
    resolver: zodResolver(depositRequestSchema),
    defaultValues: { motif: "FREE_SAVINGS", paymentMethod: "MOBILE_MONEY", reference: "" },
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
  return (
    <Card>
      <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <FormError message={serverError} />
        <DepositFields form={form} />
      </form>
    </Card>
  );
}

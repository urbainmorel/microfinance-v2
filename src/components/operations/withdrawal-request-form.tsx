"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/auth/form-error";
import { RequestSuccess } from "@/components/client/request-page-shell";
import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import {
  AlternateWithdrawalLink,
  WithdrawalFields,
} from "@/components/operations/operation-form-fields";
import { Card } from "@/components/ui/card";
import { invokeClientCommand } from "@/lib/client-command";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { withdrawalRequestSchema, type WithdrawalRequestInput } from "@/lib/schemas/operations";

function recipient(values: WithdrawalRequestInput) {
  if (values.type === "MOBILE_MONEY")
    return { name: values.recipientName, operator: values.operator, phone: values.phone };
  return { name: values.recipientName, bank: values.bank, account: values.account };
}

export function WithdrawalRequestForm({ type }: { type: "MOBILE_MONEY" | "BANK_TRANSFER" }) {
  const supabase = useSupabase();
  const runIdempotent = useIdempotentCommand();
  const [serverError, setServerError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const isMomo = type === "MOBILE_MONEY";
  const form = useForm<WithdrawalRequestInput>({
    resolver: zodResolver(withdrawalRequestSchema),
    defaultValues: { type },
  });

  async function submit(values: WithdrawalRequestInput) {
    setServerError(null);
    const target = recipient(values);
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
      if (result) setRequestId(result.id);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Le retrait n’a pas pu être envoyé.");
    }
  }

  if (requestId) return <RequestSuccess title="Demande de retrait envoyée" reference={requestId} />;
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-warning/30 bg-pastel-gold px-4 py-3 text-sm text-warning">
        Les retraits sont traités par un agent entre 8 h et 19 h. Le montant est réservé dès l’envoi
        de la demande.
      </div>
      <Card>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <FormError message={serverError} />
          <WithdrawalFields form={form} isMomo={isMomo} />
        </form>
      </Card>
      <AlternateWithdrawalLink isMomo={isMomo} />
    </div>
  );
}

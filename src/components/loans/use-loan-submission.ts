"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import { ClientCommandError, invokeClientCommand } from "@/lib/client-command";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { getAuthenticatedUserId, uploadClientDocument } from "@/lib/storage-actions";

import type { LoanRequestInput } from "@/lib/schemas/loan";
import type { UseFormReturn } from "react-hook-form";

type PendingDocuments = { fingerprint: string; paths: string[] };

async function removeDocuments(supabase: ReturnType<typeof useSupabase>, paths: string[]) {
  if (paths.length) await supabase.storage.from("loan-documents").remove(paths);
}

async function uploadDocuments(
  supabase: ReturnType<typeof useSupabase>,
  userId: string,
  files: File[],
) {
  const paths: string[] = [];
  try {
    for (const file of files) {
      paths.push(await uploadClientDocument(supabase, "loan-documents", userId, file));
    }
    return paths;
  } catch (error) {
    await removeDocuments(supabase, paths);
    throw error;
  }
}

function commandFingerprint(values: LoanRequestInput) {
  return JSON.stringify({
    productId: values.productId,
    amount: values.amount,
    durationMonths: values.durationMonths,
    purpose: values.purpose,
    disbursementMethod: values.disbursementMethod ?? "INTERNAL",
    monthlyIncomeEstimate: values.monthlyIncomeEstimate,
    documents: (values.documents ?? []).map((file) => [file.name, file.size, file.lastModified]),
  });
}

function buildLoanSubmissionPayload(values: LoanRequestInput, documentPaths: string[]) {
  return {
    productId: values.productId,
    amount: Math.trunc(Number(values.amount)),
    durationMonths: Math.trunc(Number(values.durationMonths)),
    purpose: values.purpose,
    disbursementMethod: values.disbursementMethod ?? "INTERNAL",
    ...(values.monthlyIncomeEstimate === undefined
      ? {}
      : { monthlyIncomeEstimate: Math.trunc(Number(values.monthlyIncomeEstimate)) }),
    documentPaths,
  };
}

async function ensureUploadedDocuments(
  supabase: ReturnType<typeof useSupabase>,
  userId: string,
  fingerprint: string,
  pending: PendingDocuments | null,
  files?: File[],
): Promise<PendingDocuments> {
  if (pending && pending.fingerprint !== fingerprint) {
    await removeDocuments(supabase, pending.paths);
    pending = null;
  }
  if (pending?.fingerprint === fingerprint) {
    return pending;
  }
  const paths = files && files.length > 0 ? await uploadDocuments(supabase, userId, files) : [];
  return { fingerprint, paths };
}

export function useLoanSubmission(
  simulationIsFresh: boolean,
  setError: (message: string | null) => void,
  form?: UseFormReturn<LoanRequestInput>,
) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const runIdempotent = useIdempotentCommand();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocuments | null>(null);

  async function submit(values: LoanRequestInput) {
    setError(null);
    form?.clearErrors("pin");
    if (!simulationIsFresh)
      return setError("Relancez la simulation avec les valeurs actuelles avant de soumettre.");
    const fingerprint = commandFingerprint(values);
    try {
      const result = await runIdempotent(fingerprint, async (key) => {
        const userId = await getAuthenticatedUserId(supabase);
        const uploaded = await ensureUploadedDocuments(
          supabase,
          userId,
          fingerprint,
          pendingDocuments,
          values.documents,
        );
        setPendingDocuments(uploaded);
        try {
          return await invokeClientCommand(supabase, {
            action: "loan.submit",
            pin: values.pin,
            idempotencyKey: key,
            payload: buildLoanSubmissionPayload(values, uploaded.paths),
          });
        } catch (error) {
          if (error instanceof ClientCommandError && error.code) {
            await removeDocuments(supabase, uploaded.paths);
            setPendingDocuments(null);
          }
          throw error;
        }
      });
      if (result) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["active-loan-status"] }),
          queryClient.invalidateQueries({ queryKey: ["wallet"] }),
          queryClient.invalidateQueries({ queryKey: ["active-loans-for-repayment"] }),
        ]);
        setRequestId(result.id);
      }
    } catch (error) {
      if (error instanceof ClientCommandError && error.code === "PIN_INVALID") {
        form?.setError("pin", {
          type: "server",
          message: "Code PIN incorrect. Veuillez vérifier votre saisie.",
        });
        setError(null);
      } else if (error instanceof ClientCommandError && error.code === "PIN_LOCKED") {
        form?.setError("pin", {
          type: "server",
          message: "Code PIN temporairement bloqué suite à trop de tentatives.",
        });
        setError(null);
      } else {
        setError(
          error instanceof Error ? error.message : "La demande de prêt n’a pas pu être envoyée.",
        );
      }
    }
  }

  return { requestId, submit };
}

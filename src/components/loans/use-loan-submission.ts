"use client";

import { useState } from "react";

import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import {
  ClientCommandError,
  getAuthenticatedUserId,
  invokeClientCommand,
  uploadClientDocument,
} from "@/lib/client-command";
import { useSupabase } from "@/lib/hooks/use-supabase";

import type { LoanRequestInput } from "@/lib/schemas/loan";

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
    disbursementMethod: values.disbursementMethod,
    monthlyIncomeEstimate: values.monthlyIncomeEstimate,
    documents: values.documents.map((file) => [file.name, file.size, file.lastModified]),
  });
}

export function useLoanSubmission(
  simulationIsFresh: boolean,
  setError: (message: string | null) => void,
) {
  const supabase = useSupabase();
  const runIdempotent = useIdempotentCommand();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocuments | null>(null);

  async function submit(values: LoanRequestInput) {
    setError(null);
    if (!simulationIsFresh)
      return setError("Relancez la simulation avec les valeurs actuelles avant de soumettre.");
    const fingerprint = commandFingerprint(values);
    try {
      const result = await runIdempotent(fingerprint, async (key) => {
        const userId = await getAuthenticatedUserId(supabase);
        if (pendingDocuments && pendingDocuments.fingerprint !== fingerprint) {
          await removeDocuments(supabase, pendingDocuments.paths);
          setPendingDocuments(null);
        }
        const paths =
          pendingDocuments?.fingerprint === fingerprint ? [...pendingDocuments.paths] : [];
        if (!paths.length) {
          paths.push(...(await uploadDocuments(supabase, userId, values.documents)));
          setPendingDocuments({ fingerprint, paths });
        }
        try {
          return await invokeClientCommand(supabase, {
            action: "loan.submit",
            pin: values.pin,
            idempotencyKey: key,
            payload: {
              productId: values.productId,
              amount: values.amount,
              durationMonths: values.durationMonths,
              purpose: values.purpose,
              disbursementMethod: values.disbursementMethod,
              ...(values.monthlyIncomeEstimate === undefined
                ? {}
                : { monthlyIncomeEstimate: values.monthlyIncomeEstimate }),
              documentPaths: paths,
            },
          });
        } catch (error) {
          if (error instanceof ClientCommandError && error.code) {
            await removeDocuments(supabase, paths);
            setPendingDocuments(null);
          }
          throw error;
        }
      });
      if (result) setRequestId(result.id);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "La demande de prêt n’a pas pu être envoyée.",
      );
    }
  }

  return { requestId, submit };
}

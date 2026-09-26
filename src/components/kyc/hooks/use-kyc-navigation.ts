"use client";

import { useState } from "react";

import { saveKycStep } from "@/lib/kyc-actions";
import { KYC_STEPS, type KycDocType, type KycInput, type KycStep } from "@/lib/schemas/kyc";

import type { DatabaseClient } from "@/lib/database.types";
import type { UseFormReturn } from "react-hook-form";

function isStepSatisfied(
  s: KycStep,
  idType: string | undefined,
  docs: Set<KycDocType>,
  staged: Set<KycDocType>,
): boolean {
  if (s.kind !== "upload") return true;
  if (s.optionalForPassport && idType === "PASSPORT") return true;
  return docs.has(s.docType) || staged.has(s.docType);
}

async function advanceWizardStep(
  current: KycStep,
  form: UseFormReturn<KycInput>,
  idType: string | undefined,
  docs: Set<KycDocType>,
  stagedDocs: Set<KycDocType>,
  supabase: DatabaseClient,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setStep: React.Dispatch<React.SetStateAction<number>>,
) {
  setError(null);
  if (current.kind === "fields") {
    if (!(await form.trigger([...current.fields]))) return;
    try {
      await saveKycStep(supabase, current.target, current.fields, form.getValues());
    } catch {
      setError("Enregistrement impossible pour le moment. Réessayez.");
      return;
    }
  } else if (!isStepSatisfied(current, idType, docs, stagedDocs)) {
    setError("Veuillez téléverser la pièce demandée pour continuer.");
    return;
  }
  setStep((s) => Math.min(s + 1, KYC_STEPS.length - 1));
}

function formatSubmitKycError(rpcError: { message?: string }): string {
  const msg = rpcError.message ?? "";
  if (msg.includes("KYC_DOCUMENTS_INCOMPLETE")) {
    return "Pièces justificatives incomplètes : veuillez fournir le recto de votre pièce (le verso est requis sauf pour un passeport).";
  }
  if (msg.includes("KYC_PROFILE_INCOMPLETE")) {
    return "Profil incomplet : veuillez vérifier que toutes vos informations personnelles sont renseignées.";
  }
  if (msg.includes("KYC_FINANCIALS_INCOMPLETE")) {
    return "Informations financières incomplètes : veuillez vérifier l'étape des finances.";
  }
  return msg || "Soumission impossible : vérifiez que toutes les pièces requises sont fournies.";
}

async function flushPendingUploads(pending: Map<KycDocType, Promise<void>>): Promise<boolean> {
  if (pending.size === 0) return true;
  try {
    await Promise.all(Array.from(pending.values()));
    return true;
  } catch {
    return false;
  }
}

async function submitWizardKyc(
  supabase: DatabaseClient,
  pending: Map<KycDocType, Promise<void>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
): Promise<boolean> {
  setError(null);
  const ok = await flushPendingUploads(pending);
  if (!ok) {
    setError("Veuillez attendre la fin de l'enregistrement de vos pièces.");
    return false;
  }
  const { error: rpcError } = await supabase.rpc("submit_kyc");
  if (rpcError) {
    setError(formatSubmitKycError(rpcError));
    return false;
  }
  return true;
}

export function useKycNavigation(
  form: UseFormReturn<KycInput>,
  supabase: DatabaseClient,
  docs: Set<KycDocType>,
  stagedDocs: Set<KycDocType>,
  pendingRef: React.MutableRefObject<Map<KycDocType, Promise<void>>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
  const [step, setStep] = useState(0);
  const current = KYC_STEPS[step] ?? KYC_STEPS[0];

  function next(idType: string | undefined) {
    return advanceWizardStep(current, form, idType, docs, stagedDocs, supabase, setError, setStep);
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function goToStep(index: number) {
    setError(null);
    setStep(Math.max(0, Math.min(index, KYC_STEPS.length - 1)));
  }

  function submit() {
    return submitWizardKyc(supabase, pendingRef.current, setError);
  }

  return {
    step,
    current,
    next,
    back,
    goToStep,
    submit,
  };
}

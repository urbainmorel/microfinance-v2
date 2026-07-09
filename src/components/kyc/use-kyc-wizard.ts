"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { loadKyc, loadKycDocuments, saveKycStep, uploadKycDocument } from "@/lib/kyc-actions";
import {
  KYC_STEPS,
  kycSchema,
  type KycDocType,
  type KycInput,
  type KycStep,
} from "@/lib/schemas/kyc";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** État et transitions du wizard KYC (sauvegarde auto par étape, upload, soumission). */
export function useKycWizard() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const form = useForm<KycInput>({ resolver: zodResolver(kycSchema), mode: "onTouched" });
  const [step, setStep] = useState(0);
  const [docs, setDocs] = useState<Set<KycDocType>>(new Set());
  const [uploading, setUploading] = useState<KycDocType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadKyc(supabase).then((data) => form.reset(data as KycInput));
    void loadKycDocuments(supabase).then((list) => setDocs(new Set(list)));
  }, [supabase, form]);

  const current = KYC_STEPS[step] ?? KYC_STEPS[0];
  const idType = form.getValues("id_type");

  function stepSatisfied(s: KycStep): boolean {
    if (s.kind !== "upload") return true;
    if (s.optionalForPassport && idType === "PASSPORT") return true;
    return docs.has(s.docType);
  }

  async function upload(docType: KycDocType, file: File) {
    setError(null);
    setUploading(docType);
    try {
      await uploadKycDocument(supabase, docType, file);
      setDocs((prev) => new Set(prev).add(docType));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Téléversement impossible pour le moment.");
    } finally {
      setUploading(null);
    }
  }

  async function next() {
    setError(null);
    if (current.kind === "fields") {
      if (!(await form.trigger([...current.fields]))) return;
      try {
        await saveKycStep(supabase, current.target, current.fields, form.getValues());
      } catch {
        setError("Enregistrement impossible pour le moment. Réessayez.");
        return;
      }
    } else if (!stepSatisfied(current)) {
      setError("Veuillez téléverser la pièce demandée pour continuer.");
      return;
    }
    setStep((s) => Math.min(s + 1, KYC_STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit(): Promise<boolean> {
    setError(null);
    const { error: rpcError } = await supabase.rpc("submit_kyc");
    if (rpcError) {
      setError("Soumission impossible : vérifiez que toutes les pièces requises sont fournies.");
      return false;
    }
    return true;
  }

  return { form, step, current, docs, uploading, error, idType, next, back, upload, submit };
}

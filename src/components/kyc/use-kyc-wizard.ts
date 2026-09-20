"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { type UseFormReturn, useForm, useWatch } from "react-hook-form";

import { compressImageFile } from "@/lib/image-compression";
import { loadKyc, loadKycDocuments, saveKycStep, uploadKycDocument } from "@/lib/kyc-actions";
import {
  KYC_STEPS,
  kycSchema,
  type KycDocType,
  type KycInput,
  type KycStep,
} from "@/lib/schemas/kyc";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import type { DatabaseClient } from "@/lib/database.types";

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

async function processAndUpload(
  supabase: DatabaseClient,
  docType: KycDocType,
  file: File,
): Promise<void> {
  const compressed = await compressImageFile(file);
  await uploadKycDocument(supabase, docType, compressed);
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

function clearDocState(
  docType: KycDocType,
  setStaged: React.Dispatch<React.SetStateAction<Set<KycDocType>>>,
  setDocs: React.Dispatch<React.SetStateAction<Set<KycDocType>>>,
  setPreviews: React.Dispatch<React.SetStateAction<Partial<Record<KycDocType, string>>>>,
  pending: Map<KycDocType, Promise<void>>,
  activeUploads: Map<KycDocType, number>,
) {
  activeUploads.delete(docType);
  pending.delete(docType);
  setStaged((prev) => {
    const n = new Set(prev);
    n.delete(docType);
    return n;
  });
  setDocs((prev) => {
    const n = new Set(prev);
    n.delete(docType);
    return n;
  });
  setPreviews((prev) => {
    const n = { ...prev };
    const old = n[docType];
    if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
    delete n[docType];
    return n;
  });
}

function formatUploadError(e: unknown): string {
  if (!(e instanceof Error)) return "Téléversement impossible pour le moment.";
  const msg = e.message;
  if (msg.includes("row-level security") || msg.includes("RLS")) {
    return "Action non autorisée : votre dossier n'est pas modifiable actuellement.";
  }
  return msg || "Téléversement impossible pour le moment.";
}

function startUploadTask(
  supabase: DatabaseClient,
  docType: KycDocType,
  file: File,
  uploadId: number,
  activeUploads: Map<KycDocType, number>,
  setDocs: React.Dispatch<React.SetStateAction<Set<KycDocType>>>,
  setStaged: React.Dispatch<React.SetStateAction<Set<KycDocType>>>,
  setUploading: React.Dispatch<React.SetStateAction<KycDocType | null>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  pending: Map<KycDocType, Promise<void>>,
) {
  const task = processAndUpload(supabase, docType, file)
    .then(() => {
      if (activeUploads.get(docType) === uploadId) {
        setDocs((prev) => new Set(prev).add(docType));
      }
    })
    .catch((e: unknown) => {
      if (activeUploads.get(docType) === uploadId) {
        setError(formatUploadError(e));
        setStaged((prev) => {
          const next = new Set(prev);
          next.delete(docType);
          return next;
        });
      }
    })
    .finally(() => {
      if (activeUploads.get(docType) === uploadId) {
        setUploading(null);
        pending.delete(docType);
      }
    });

  pending.set(docType, task);
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
    return "Pièces justificatives incomplètes : veuillez fournir le recto et le selfie (le verso est requis sauf pour un passeport).";
  }
  if (msg.includes("KYC_PROFILE_INCOMPLETE")) {
    return "Profil incomplet : veuillez vérifier que toutes vos informations personnelles sont renseignées.";
  }
  if (msg.includes("KYC_FINANCIALS_INCOMPLETE")) {
    return "Informations financières incomplètes : veuillez vérifier l'étape des finances.";
  }
  return msg || "Soumission impossible : vérifiez que toutes les pièces requises sont fournies.";
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

function handleFileUpload(
  supabase: DatabaseClient,
  docType: KycDocType,
  file: File,
  activeUploads: Map<KycDocType, number>,
  pending: Map<KycDocType, Promise<void>>,
  setStagedDocs: React.Dispatch<React.SetStateAction<Set<KycDocType>>>,
  setPreviews: React.Dispatch<React.SetStateAction<Partial<Record<KycDocType, string>>>>,
  setUploading: React.Dispatch<React.SetStateAction<KycDocType | null>>,
  setDocs: React.Dispatch<React.SetStateAction<Set<KycDocType>>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
  setError(null);
  if (docType === "SELFIE" && file.type === "application/pdf") {
    setError(
      "Les fichiers PDF ne sont pas autorisés pour le selfie. Veuillez choisir une image (JPG ou PNG).",
    );
    return;
  }
  const uploadId = Date.now();
  activeUploads.set(docType, uploadId);
  setStagedDocs((prev) => new Set(prev).add(docType));
  if (file.type.startsWith("image/")) {
    setPreviews((prev) => ({ ...prev, [docType]: URL.createObjectURL(file) }));
  }
  setUploading(docType);
  startUploadTask(
    supabase,
    docType,
    file,
    uploadId,
    activeUploads,
    setDocs,
    setStagedDocs,
    setUploading,
    setError,
    pending,
  );
}

/** État et transitions du wizard KYC avec compression asynchrone non-bloquante. */
export function useKycWizard() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const form = useForm<KycInput>({ resolver: zodResolver(kycSchema), mode: "onTouched" });
  const [step, setStep] = useState(0);
  const [docs, setDocs] = useState<Set<KycDocType>>(new Set());
  const [stagedDocs, setStagedDocs] = useState<Set<KycDocType>>(new Set());
  const [previews, setPreviews] = useState<Partial<Record<KycDocType, string>>>({});
  const [uploading, setUploading] = useState<KycDocType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Map<KycDocType, Promise<void>>>(new Map());
  const activeUploadsRef = useRef<Map<KycDocType, number>>(new Map());

  useEffect(() => {
    void loadKyc(supabase).then((data) => form.reset(data as KycInput));
    void loadKycDocuments(supabase).then((list) => setDocs(new Set(list)));
  }, [supabase, form]);

  const current = KYC_STEPS[step] ?? KYC_STEPS[0];
  const idType = useWatch({ control: form.control, name: "id_type" });

  function upload(docType: KycDocType, file: File) {
    handleFileUpload(
      supabase,
      docType,
      file,
      activeUploadsRef.current,
      pendingRef.current,
      setStagedDocs,
      setPreviews,
      setUploading,
      setDocs,
      setError,
    );
  }

  function next() {
    return advanceWizardStep(current, form, idType, docs, stagedDocs, supabase, setError, setStep);
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function remove(docType: KycDocType) {
    setError(null);
    clearDocState(
      docType,
      setStagedDocs,
      setDocs,
      setPreviews,
      pendingRef.current,
      activeUploadsRef.current,
    );
  }

  function submit() {
    return submitWizardKyc(supabase, pendingRef.current, setError);
  }

  function goToStep(index: number) {
    setError(null);
    setStep(Math.max(0, Math.min(index, KYC_STEPS.length - 1)));
  }

  return {
    form,
    step,
    current,
    docs,
    stagedDocs,
    previews,
    uploading,
    error,
    idType,
    next,
    back,
    goToStep,
    upload,
    remove,
    submit,
  };
}

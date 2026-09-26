"use client";

import { useEffect, useRef, useState } from "react";

import { compressImageFile } from "@/lib/image-compression";
import { loadKycDocuments, uploadKycDocument } from "@/lib/kyc-actions";

import type { DatabaseClient } from "@/lib/database.types";
import type { KycDocType } from "@/lib/schemas/kyc";

async function processAndUpload(
  supabase: DatabaseClient,
  docType: KycDocType,
  file: File,
): Promise<void> {
  const compressed = await compressImageFile(file);
  await uploadKycDocument(supabase, docType, compressed);
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

export function useKycUploads(
  supabase: DatabaseClient,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
  const [docs, setDocs] = useState<Set<KycDocType>>(new Set());
  const [stagedDocs, setStagedDocs] = useState<Set<KycDocType>>(new Set());
  const [previews, setPreviews] = useState<Partial<Record<KycDocType, string>>>({});
  const [uploading, setUploading] = useState<KycDocType | null>(null);
  const pendingRef = useRef<Map<KycDocType, Promise<void>>>(new Map());
  const activeUploadsRef = useRef<Map<KycDocType, number>>(new Map());

  useEffect(() => {
    void loadKycDocuments(supabase).then((list) => setDocs(new Set(list)));
  }, [supabase]);

  function upload(docType: KycDocType, file: File) {
    setError(null);
    const uploadId = Date.now();
    activeUploadsRef.current.set(docType, uploadId);
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
      activeUploadsRef.current,
      setDocs,
      setStagedDocs,
      setUploading,
      setError,
      pendingRef.current,
    );
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

  return {
    docs,
    stagedDocs,
    previews,
    uploading,
    pendingRef,
    upload,
    remove,
  };
}

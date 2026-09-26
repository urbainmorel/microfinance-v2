"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useKycNavigation } from "@/components/kyc/hooks/use-kyc-navigation";
import { useKycUploads } from "@/components/kyc/hooks/use-kyc-uploads";
import { loadKyc } from "@/lib/kyc-actions";
import { kycSchema, type KycInput } from "@/lib/schemas/kyc";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Compositeur d'état et transitions du wizard KYC.
 * Orchestre la navigation, la validation de formulaire et les téléversements.
 */
export function useKycWizard() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [error, setError] = useState<string | null>(null);

  const form = useForm<KycInput>({ resolver: zodResolver(kycSchema), mode: "onTouched" });
  const idType = useWatch({ control: form.control, name: "id_type" });

  const uploads = useKycUploads(supabase, setError);
  const navigation = useKycNavigation(
    form,
    supabase,
    uploads.docs,
    uploads.stagedDocs,
    uploads.pendingRef,
    setError,
  );

  useEffect(() => {
    void loadKyc(supabase).then((data) => form.reset(data as KycInput));
  }, [supabase, form]);

  return {
    form,
    step: navigation.step,
    current: navigation.current,
    docs: uploads.docs,
    stagedDocs: uploads.stagedDocs,
    previews: uploads.previews,
    uploading: uploads.uploading,
    error,
    idType,
    next: () => navigation.next(idType),
    back: navigation.back,
    goToStep: navigation.goToStep,
    upload: uploads.upload,
    remove: uploads.remove,
    submit: navigation.submit,
  };
}

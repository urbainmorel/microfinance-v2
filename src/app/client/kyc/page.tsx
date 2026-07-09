"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormError } from "@/components/auth/form-error";
import { KycStepBody } from "@/components/kyc/kyc-step-body";
import { KycStepper } from "@/components/kyc/kyc-stepper";
import { useKycWizard } from "@/components/kyc/use-kyc-wizard";
import { Button } from "@/components/ui/button";
import { KYC_STEPS } from "@/lib/schemas/kyc";

export default function KycPage() {
  const router = useRouter();
  const { form, step, current, docs, uploading, error, idType, next, back, upload, submit } =
    useKycWizard();
  const [certified, setCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isConfirm = current.kind === "confirm";

  async function onSubmit() {
    setSubmitting(true);
    const ok = await submit();
    setSubmitting(false);
    if (ok) router.push("/client/dashboard");
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Compléter mon profil</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Vos informations sont enregistrées à chaque étape.
      </p>
      <KycStepper steps={KYC_STEPS.map((s) => s.title)} current={step} />
      <FormError message={error} />
      <div className="mt-4 flex flex-col gap-4">
        <KycStepBody
          step={current}
          form={form}
          docs={docs}
          uploading={uploading}
          isPassport={idType === "PASSPORT"}
          certified={certified}
          onUpload={upload}
          onCertifiedChange={setCertified}
        />
      </div>
      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <Button variant="outline" onClick={back}>
            Retour
          </Button>
        ) : null}
        {isConfirm ? (
          <Button className="flex-1" onClick={onSubmit} disabled={!certified || submitting}>
            {submitting ? "Envoi…" : "Soumettre mon dossier KYC"}
          </Button>
        ) : (
          <Button className="flex-1" onClick={next}>
            Continuer
          </Button>
        )}
      </div>
    </div>
  );
}

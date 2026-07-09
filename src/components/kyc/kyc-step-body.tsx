"use client";

import { type UseFormReturn } from "react-hook-form";

import { FieldControl } from "@/components/kyc/field-control";
import { FileUploadField } from "@/components/kyc/file-upload-field";
import { ACCEPTED_DOC_ATTR, type KycDocType, type KycInput, type KycStep } from "@/lib/schemas/kyc";

type Props = {
  step: KycStep;
  form: UseFormReturn<KycInput>;
  docs: Set<KycDocType>;
  uploading: KycDocType | null;
  isPassport: boolean;
  certified: boolean;
  onUpload: (docType: KycDocType, file: File) => void;
  onCertifiedChange: (value: boolean) => void;
};

const UPLOAD_LABEL: Record<KycDocType, string> = {
  ID_FRONT: "Recto de votre pièce d'identité",
  ID_BACK: "Verso de votre pièce d'identité",
  SELFIE: "Selfie avec votre pièce à côté du visage",
};

/** Corps de l'étape courante du wizard KYC : saisie, upload, ou confirmation. */
export function KycStepBody({
  step,
  form,
  docs,
  uploading,
  isPassport,
  certified,
  onUpload,
  onCertifiedChange,
}: Props) {
  if (step.kind === "fields") {
    return step.fields.map((field) => <FieldControl key={field} name={field} form={form} />);
  }

  if (step.kind === "upload") {
    const optional = Boolean(step.optionalForPassport && isPassport);
    return (
      <FileUploadField
        label={UPLOAD_LABEL[step.docType]}
        hint={optional ? "Non requis pour un passeport" : "JPG, PNG ou PDF — 5 Mo maximum"}
        accept={ACCEPTED_DOC_ATTR}
        uploaded={docs.has(step.docType)}
        busy={uploading === step.docType}
        optional={optional}
        onSelect={(file) => onUpload(step.docType, file)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-[14px] border border-border bg-card p-4 text-sm text-muted-foreground">
        Vérifiez vos informations avant l’envoi. Votre dossier sera ensuite étudié par nos équipes.
      </p>
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          checked={certified}
          onChange={(event) => onCertifiedChange(event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>Je certifie l’exactitude des informations fournies.</span>
      </label>
    </div>
  );
}

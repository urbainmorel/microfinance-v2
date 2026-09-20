"use client";

import { type UseFormReturn } from "react-hook-form";

import { FieldControl } from "@/components/kyc/field-control";
import { FileUploadField } from "@/components/kyc/file-upload-field";
import { ACCEPTED_DOC_ATTR, type KycDocType, type KycInput, type KycStep } from "@/lib/schemas/kyc";
import { cn } from "@/lib/utils";

type Props = {
  step: KycStep;
  form: UseFormReturn<KycInput>;
  docs: Set<KycDocType>;
  previews?: Partial<Record<KycDocType, string>>;
  uploading: KycDocType | null;
  isPassport: boolean;
  certified: boolean;
  onUpload: (docType: KycDocType, file: File) => void;
  onRemove: (docType: KycDocType) => void;
  onCertifiedChange: (value: boolean) => void;
};

const UPLOAD_LABEL: Record<KycDocType, string> = {
  ID_FRONT: "",
  ID_BACK: "",
  SELFIE: "",
};

function KycConfirmStep({
  certified,
  onCertifiedChange,
}: {
  certified: boolean;
  onCertifiedChange: (c: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <p className="rounded-2xl border border-border bg-muted/50 p-4 text-sm leading-6 text-muted-foreground sm:p-5">
        Vérifiez vos informations avant l’envoi. Votre dossier sera ensuite étudié par nos équipes.
      </p>
      <label className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-foreground transition-colors hover:border-accent/40">
        <input
          type="checkbox"
          checked={certified}
          onChange={(event) => onCertifiedChange(event.target.checked)}
          className="mt-0.5 size-5 accent-accent"
        />
        <span className="font-medium">
          Je certifie l’exactitude de toutes les informations fournies.
        </span>
      </label>
    </div>
  );
}

/** Corps de l'étape courante du wizard KYC : saisie, upload, ou confirmation. */
export function KycStepBody({
  step,
  form,
  docs,
  previews,
  uploading,
  isPassport,
  certified,
  onUpload,
  onRemove,
  onCertifiedChange,
}: Props) {
  if (step.kind === "fields") {
    const fieldCount = step.fields.length;
    return (
      <div
        className={cn(
          "grid gap-4 sm:gap-5",
          fieldCount > 1
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
            : "grid-cols-1",
        )}
      >
        {step.fields.map((field) => {
          const isFullWidth = field === "address" || field === "usual_bank";
          return (
            <div
              key={field}
              className={
                isFullWidth ? "col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-3" : "col-span-1"
              }
            >
              <FieldControl name={field} form={form} />
            </div>
          );
        })}
      </div>
    );
  }

  if (step.kind === "upload") {
    const optional = Boolean(step.optionalForPassport && isPassport);
    const isSelfie = step.docType === "SELFIE";

    return (
      <div className="flex w-full flex-col gap-5">
        <FileUploadField
          docType={step.docType}
          label={UPLOAD_LABEL[step.docType]}
          hint={
            isSelfie
              ? "JPG ou PNG — 5 Mo maximum (images uniquement)"
              : optional
                ? "Non requis pour un passeport"
                : "JPG, PNG ou PDF — 5 Mo maximum"
          }
          accept={isSelfie ? ".jpg,.jpeg,.png,image/jpeg,image/png" : ACCEPTED_DOC_ATTR}
          uploaded={docs.has(step.docType)}
          busy={uploading === step.docType}
          optional={optional}
          previewUrl={previews?.[step.docType]}
          onSelect={(file) => onUpload(step.docType, file)}
          onRemove={() => onRemove(step.docType)}
        />
      </div>
    );
  }

  return <KycConfirmStep certified={certified} onCertifiedChange={onCertifiedChange} />;
}

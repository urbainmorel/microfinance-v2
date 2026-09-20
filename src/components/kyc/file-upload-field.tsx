"use client";

import { AlertCircle } from "lucide-react";
import { useRef, useState } from "react";

import { CameraCaptureModal } from "@/components/kyc/camera-capture-modal";
import { DocumentVisualCard } from "@/components/kyc/document-visual-card";
import { UploadOptionsGrid } from "@/components/kyc/upload-options-grid";
import { type KycDocType } from "@/lib/schemas/kyc";

type Props = {
  docType: KycDocType;
  label: string;
  hint: string;
  accept: string;
  uploaded: boolean;
  busy: boolean;
  optional?: boolean;
  previewUrl?: string;
  error?: string | null;
  onSelect: (file: File) => void;
  onRemove?: () => void;
};

function FieldHeader({
  label,
  hint,
  optional,
  hasDocument,
}: {
  label: string;
  hint: string;
  optional?: boolean;
  hasDocument: boolean;
}) {
  if (label) {
    return (
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">
          {label}
          {optional ? <span className="font-normal text-muted-foreground"> (facultatif)</span> : ""}
        </span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    );
  }
  if (hint && !hasDocument) {
    return (
      <div className="flex justify-center text-center">
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    );
  }
  return null;
}

export function FileUploadField({
  docType,
  label,
  hint,
  accept,
  uploaded,
  busy,
  optional,
  previewUrl,
  error,
  onSelect,
  onRemove,
}: Props) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      if (docType === "SELFIE" && file.type === "application/pdf") {
        event.target.value = "";
        return;
      }
      onSelect(file);
    }
    event.target.value = "";
  }

  function handleRemove() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onRemove?.();
  }

  const hasDocument = uploaded || Boolean(previewUrl);

  return (
    <div className="flex flex-col gap-3">
      <DocumentVisualCard
        docType={docType}
        previewUrl={previewUrl}
        uploaded={uploaded}
        busy={busy}
        optional={optional}
        onOpenCamera={() => setCameraOpen(true)}
        onOpenGallery={() => inputRef.current?.click()}
        onRemove={handleRemove}
      />

      <FieldHeader label={label} hint={hint} optional={optional} hasDocument={hasDocument} />

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {!hasDocument ? (
        <UploadOptionsGrid
          docType={docType}
          busy={busy}
          onOpenCamera={() => setCameraOpen(true)}
          onOpenGallery={() => inputRef.current?.click()}
        />
      ) : null}

      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
          <AlertCircle className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          {error}
        </p>
      ) : null}

      <CameraCaptureModal
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        docType={docType}
        onCapture={onSelect}
      />
    </div>
  );
}

import { AlertCircle, FileUp } from "lucide-react";

import { OPERATION_DOCUMENT_ACCEPT } from "@/lib/schemas/operations";

export function DocumentField({
  id,
  label,
  error,
  multiple = false,
  selectedFiles = [],
  onChange,
}: {
  id: string;
  label: string;
  error?: string;
  multiple?: boolean;
  selectedFiles?: readonly File[];
  onChange: (files: File[]) => void;
}) {
  const errorId = error ? `${id}-error` : undefined;
  const selectedLabel = selectedFiles.length
    ? selectedFiles.length === 1
      ? selectedFiles[0]?.name
      : `${selectedFiles.length} fichiers sélectionnés`
    : null;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
        {label}
      </label>
      <label
        htmlFor={id}
        className="flex min-h-[92px] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input bg-muted/45 px-4 text-sm text-foreground transition-colors focus-within:border-ring hover:border-accent/40 hover:bg-finance-soft/50"
      >
        <FileUp className="size-5 shrink-0 text-accent" strokeWidth={1.8} aria-hidden />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">
            {selectedLabel ?? "Choisir un justificatif"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG ou PDF, 10 Mo maximum{multiple ? " par fichier" : ""}
          </span>
        </span>
        <input
          id={id}
          type="file"
          accept={OPERATION_DOCUMENT_ACCEPT}
          multiple={multiple}
          className="sr-only"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={(event) => {
            onChange(Array.from(event.target.files ?? []));
            event.currentTarget.value = "";
          }}
        />
      </label>
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-xs font-medium text-warning">
          <AlertCircle className="size-3.5" strokeWidth={1.8} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

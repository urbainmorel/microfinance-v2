import { AlertCircle, FileUp } from "lucide-react";

import { OPERATION_DOCUMENT_ACCEPT } from "@/lib/schemas/operations";

export function DocumentField({
  id,
  label,
  error,
  multiple = false,
  onChange,
}: {
  id: string;
  label: string;
  error?: string;
  multiple?: boolean;
  onChange: (files: File[]) => void;
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <label
        htmlFor={id}
        className="flex min-h-[76px] cursor-pointer items-center gap-3 rounded-[14px] border border-dashed border-border bg-card px-4 text-sm text-foreground focus-within:border-ring"
      >
        <FileUp className="size-5 shrink-0 text-accent" strokeWidth={1.8} aria-hidden />
        <span>JPG, PNG ou PDF, 10 Mo maximum{multiple ? " par fichier" : ""}</span>
        <input
          id={id}
          type="file"
          accept={OPERATION_DOCUMENT_ACCEPT}
          multiple={multiple}
          className="sr-only"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={(event) => onChange(Array.from(event.target.files ?? []))}
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

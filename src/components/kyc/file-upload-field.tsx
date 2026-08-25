"use client";

import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  hint: string;
  accept: string;
  uploaded: boolean;
  busy: boolean;
  optional?: boolean;
  error?: string | null;
  onSelect: (file: File) => void;
};

export function FileUploadField({
  label,
  hint,
  accept,
  uploaded,
  busy,
  optional,
  error,
  onSelect,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-foreground">
        {label}
        {optional ? " (facultatif)" : ""}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={cn(
          "flex min-h-[92px] items-center gap-3 rounded-xl border bg-muted/45 p-4 text-left transition-colors",
          "focus-visible:border-ring focus-visible:outline-none disabled:opacity-70",
          uploaded
            ? "border-accent/40 bg-finance-soft/45"
            : "border-dashed border-input hover:border-accent/40",
        )}
      >
        {busy ? (
          <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : uploaded ? (
          <CheckCircle2 className="size-5 shrink-0 text-accent" strokeWidth={1.8} aria-hidden />
        ) : (
          <FileUp className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
        )}
        <span className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {busy
              ? "Envoi en cours…"
              : uploaded
                ? "Pièce enregistrée — remplacer"
                : "Choisir un fichier"}
          </span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </span>
      </button>
      {error ? (
        <p className="flex items-center gap-1 text-xs font-medium text-warning">
          <AlertCircle className="size-3.5" strokeWidth={1.8} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

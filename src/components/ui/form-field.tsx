import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";

type FormFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

/**
 * Champ de formulaire labellisé avec message d'erreur (DESIGN §8, §15, §17).
 * L'erreur est doublée icône + texte, en doré (jamais de rouge, DESIGN §4.2).
 */
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, id, ...props },
  ref,
) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        ref={ref}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        {...props}
      />
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-xs font-medium text-warning">
          <AlertCircle className="size-3.5" strokeWidth={1.8} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
});

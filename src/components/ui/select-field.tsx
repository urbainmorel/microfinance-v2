import { AlertCircle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  options: Option[];
  placeholder?: string;
};

/** Sélecteur natif stylé + label + erreur (DESIGN §8) ; évite une dépendance Radix. */
export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ label, error, id, options, placeholder, ...props }, ref) {
    const errorId = error ? `${id}-error` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
          {label}
        </label>
        <select
          id={id}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            "h-[52px] rounded-[14px] border border-border bg-card px-4 text-base text-foreground",
            "focus-visible:border-ring focus-visible:outline-none",
          )}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error ? (
          <p id={errorId} className="flex items-center gap-1 text-xs font-medium text-warning">
            <AlertCircle className="size-3.5" strokeWidth={1.8} aria-hidden />
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

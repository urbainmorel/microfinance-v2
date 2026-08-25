import { AlertCircle, ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  options: Option[];
  placeholder?: string;
};

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ label, error, id, options, placeholder, ...props }, ref) {
    const errorId = error ? `${id}-error` : undefined;
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
          {label}
        </label>
        <div className="relative">
          <select
            id={id}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={cn(
              "h-[52px] w-full appearance-none rounded-xl border border-input bg-card px-4 pr-11 text-base font-medium text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.025)]",
              "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/10 aria-[invalid=true]:border-warning/60",
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
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        </div>
        {error ? (
          <p id={errorId} className="flex items-center gap-1.5 text-xs font-semibold text-warning">
            <AlertCircle className="size-3.5" strokeWidth={1.8} aria-hidden />
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

import { AlertCircle } from "lucide-react";
import * as React from "react";

import { Input, type InputProps } from "@/components/ui/input";

type FormFieldProps = InputProps & {
  label: string;
  error?: string;
};

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, id, ...props },
  ref,
) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
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
        <p id={errorId} className="flex items-center gap-1.5 text-xs font-semibold text-warning">
          <AlertCircle className="size-3.5" strokeWidth={1.8} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
});

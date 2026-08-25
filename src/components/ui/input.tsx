import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-[52px] w-full rounded-xl border border-input bg-card px-4 text-base font-medium text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.025)] transition-[border-color,box-shadow] placeholder:font-normal placeholder:text-muted-foreground/75 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-[invalid=true]:border-warning/60",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Input };

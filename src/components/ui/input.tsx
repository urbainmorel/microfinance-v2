import * as React from "react";

import { cn } from "@/lib/utils";

/** Champ de saisie — DESIGN §8. Hauteur 52px, radius 14px, texte ≥16px (anti-zoom iOS). */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-[52px] w-full rounded-[14px] border border-border bg-card px-4 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Input };

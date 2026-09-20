"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, showPasswordToggle = true, ...props },
  ref,
) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === "password";

  if (!isPassword || !showPasswordToggle) {
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
  }

  return (
    <div className="relative flex w-full items-center">
      <input
        type={showPassword ? "text" : "password"}
        ref={ref}
        className={cn(
          "flex h-[52px] w-full rounded-xl border border-input bg-card pl-4 pr-12 text-base font-medium text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.025)] transition-[border-color,box-shadow] placeholder:font-normal placeholder:text-muted-foreground/75 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-[invalid=true]:border-warning/60",
          className,
          "pr-12",
        )}
        {...props}
      />
      <button
        type="button"
        disabled={props.disabled}
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50"
        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={showPassword}
      >
        {showPassword ? (
          <EyeOff className="size-5" aria-hidden />
        ) : (
          <Eye className="size-5" aria-hidden />
        )}
      </button>
    </div>
  );
});

export { Input };

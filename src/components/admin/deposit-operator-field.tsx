"use client";

import { CheckCircle2 } from "lucide-react";

import { MOBILE_OPERATORS, OperatorLogo } from "@/components/ui/operator-logo";
import { cn } from "@/lib/utils";

type DepositOperatorFieldProps = {
  value: string;
  onChange: (val: string) => void;
};

export function DepositOperatorField({ value, onChange }: DepositOperatorFieldProps) {
  const current = value.trim().toUpperCase();

  return (
    <div className="mb-6 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="space-y-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Opérateur Mobile Money (Logo du numéro de transfert)
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            Activez le logo officiel correspondant à votre numéro de dépôt. Il s&apos;affichera au
            format carré 1:1 au-dessus du numéro pour les clients.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <button
            type="button"
            onClick={() => onChange("")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all",
              !current
                ? "shadow-xs border-accent bg-accent/15 text-accent ring-1 ring-accent"
                : "border-border/70 bg-background/60 text-muted-foreground hover:border-border hover:bg-muted/40",
            )}
            aria-pressed={!current}
          >
            <div className="flex size-11 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/40 text-xs font-bold text-muted-foreground">
              —
            </div>
            <span className="text-xs font-bold">Aucun</span>
          </button>

          {MOBILE_OPERATORS.map((op) => {
            const isSelected = current === op.id;
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => onChange(isSelected ? "" : op.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all",
                  isSelected
                    ? "shadow-xs border-accent bg-accent/15 ring-1 ring-accent"
                    : "border-border/70 bg-background/60 hover:border-border hover:bg-muted/40",
                )}
                aria-pressed={isSelected}
              >
                <div className="shadow-xs size-11 overflow-hidden rounded-xl border border-border/50">
                  <OperatorLogo operator={op.id} size={48} className="size-full object-cover" />
                </div>
                <span
                  className={cn(
                    "text-xs font-bold",
                    isSelected ? "text-accent" : "text-foreground",
                  )}
                >
                  {op.name}
                </span>
                {isSelected ? (
                  <span className="shadow-xs absolute -right-1.5 -top-1.5 rounded-full bg-accent p-0.5 text-accent-foreground">
                    <CheckCircle2 className="size-3.5" aria-hidden />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

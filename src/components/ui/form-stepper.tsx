import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type FormStep = {
  label: string;
  description?: string;
};

export function FormStepper({
  steps,
  currentStep,
  className,
}: {
  steps: readonly FormStep[];
  currentStep: number;
  className?: string;
}) {
  const activeStep = Math.min(Math.max(currentStep, 0), Math.max(steps.length - 1, 0));

  return (
    <nav
      className={cn("rounded-2xl border border-border bg-card px-4 py-4 sm:px-5", className)}
      aria-label="Progression du formulaire"
    >
      <p className="mb-4 text-xs font-semibold text-muted-foreground sm:hidden">
        Étape {activeStep + 1} sur {steps.length} · {steps[activeStep]?.label}
      </p>
      <ol
        className="grid"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, index) => {
          const complete = index < activeStep;
          const active = index === activeStep;
          return (
            <li
              key={step.label}
              className="relative min-w-0"
              aria-current={active ? "step" : undefined}
            >
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 h-px",
                    index < activeStep ? "bg-accent" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
              <div className="relative flex flex-col items-center text-center">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full border text-xs font-bold transition-colors",
                    complete && "border-accent bg-accent text-accent-foreground",
                    active && "border-accent bg-card text-accent ring-4 ring-accent/10",
                    !complete && !active && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {complete ? <Check className="size-4" aria-hidden /> : index + 1}
                </span>
                <span
                  className={cn(
                    "mt-2 hidden text-xs font-semibold sm:block",
                    active || complete ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                {step.description ? (
                  <span className="mt-0.5 hidden text-[11px] text-muted-foreground lg:block">
                    {step.description}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

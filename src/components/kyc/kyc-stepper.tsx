import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

function MobileKycStepper({
  steps,
  activeIndex,
}: {
  steps: readonly string[];
  activeIndex: number;
}) {
  const percent = Math.round(((activeIndex + 1) / steps.length) * 100);
  return (
    <div className="sm:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">
            Étape {activeIndex + 1} sur {steps.length}
          </p>
          <p className="mt-0.5 text-base font-bold text-foreground">{steps[activeIndex]}</p>
        </div>
        <span className="shrink-0 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          {percent} %
        </span>
      </div>

      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={activeIndex + 1}
      >
        {steps.map((label, i) => (
          <span
            key={label}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              i <= activeIndex ? "bg-accent" : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function DesktopKycStepper({
  steps,
  activeIndex,
}: {
  steps: readonly string[];
  activeIndex: number;
}) {
  const percent = Math.round(((activeIndex + 1) / steps.length) * 100);
  return (
    <div className="hidden sm:block">
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
            Étape {activeIndex + 1} sur {steps.length}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
            {steps[activeIndex]}
          </h2>
        </div>
        <span className="shrink-0 rounded-xl border border-border bg-muted/40 px-3.5 py-1.5 text-xs font-bold text-foreground">
          Progression : {percent} %
        </span>
      </div>

      <ol
        className="grid w-full gap-1.5"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        aria-label="Progression du KYC"
      >
        {steps.map((stepTitle, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;

          return (
            <li key={stepTitle} className="flex flex-col items-center">
              <div className="relative flex w-full items-center justify-center">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border text-xs font-bold transition-all",
                    isCompleted && "border-accent bg-accent text-accent-foreground",
                    isActive && "border-accent bg-card text-accent ring-4 ring-accent/15",
                    !isCompleted && !isActive && "border-border bg-muted/60 text-muted-foreground",
                  )}
                >
                  {isCompleted ? <Check className="size-3.5" strokeWidth={2.2} /> : index + 1}
                </div>
              </div>
              <span
                className={cn(
                  "mt-1.5 hidden text-center text-[10px] font-semibold leading-tight lg:line-clamp-1",
                  isActive || isCompleted ? "text-foreground" : "text-muted-foreground",
                )}
                title={stepTitle}
              >
                {stepTitle}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function KycStepper({ steps, current }: { steps: readonly string[]; current: number }) {
  const activeIndex = Math.min(Math.max(current, 0), steps.length - 1);

  return (
    <div className="mb-6 sm:mb-8">
      <MobileKycStepper steps={steps} activeIndex={activeIndex} />
      <DesktopKycStepper steps={steps} activeIndex={activeIndex} />
    </div>
  );
}

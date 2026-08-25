import { cn } from "@/lib/utils";

export function KycStepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="mb-7">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] font-bold text-foreground">{steps[current]}</p>
        <p className="shrink-0 text-xs font-semibold text-muted-foreground">
          {current + 1} sur {steps.length}
        </p>
      </div>
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
      >
        {steps.map((label, i) => (
          <span
            key={label}
            className={cn("h-1 flex-1 rounded-full", i <= current ? "bg-accent" : "bg-muted")}
          />
        ))}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

/** Stepper KYC — segments pill (DESIGN §8, sauvegarde auto par étape PRD §6.4). */
export function KycStepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="mb-6">
      <div className="flex gap-1.5">
        {steps.map((label, i) => (
          <span
            key={label}
            className={cn("h-1.5 flex-1 rounded-pill", i <= current ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Étape {current + 1} / {steps.length} — {steps[current]}
      </p>
    </div>
  );
}

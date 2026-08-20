import { formatStatus } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

const positive = new Set([
  "COMPLETED",
  "CONFIRMED",
  "ACCEPTED",
  "GUARANTEE_COMPLETE",
  "DISBURSED",
  "ACTIVE",
]);
const attention = new Set([
  "PENDING",
  "IN_REVIEW",
  "SUBMITTED",
  "IN_ANALYSIS",
  "PROCESSING",
  "AWAITING_DISBURSEMENT",
]);
const info = new Set(["INFO_REQUESTED", "PRE_APPROVED", "GUARANTEE_PENDING"]);

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        positive.has(status) && "bg-secondary text-[hsl(var(--brand-green-mid))]",
        attention.has(status) && "bg-[hsl(var(--pastel-gold))] text-[hsl(var(--gold))]",
        info.has(status) && "bg-[hsl(var(--pastel-blue))] text-[hsl(var(--blue))]",
        !positive.has(status) &&
          !attention.has(status) &&
          !info.has(status) &&
          "bg-muted text-muted-foreground",
      )}
    >
      {formatStatus(status)}
    </span>
  );
}

import { CheckCircle2, CircleDashed, CircleX, Clock3, Info, type LucideIcon } from "lucide-react";

import { formatStatus } from "@/lib/admin/format";

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
const negative = new Set(["REJECTED", "CANCELLED", "INACTIVE", "DEFAULTED"]);

function styleFor(status: string): { icon: LucideIcon; className: string } {
  if (positive.has(status)) {
    return {
      icon: CheckCircle2,
      className: "border-border bg-muted text-success",
    };
  }
  if (attention.has(status)) {
    return {
      icon: Clock3,
      className: "border-pastel-gold bg-pastel-gold text-warning",
    };
  }
  if (info.has(status)) {
    return {
      icon: Info,
      className: "border-secondary bg-secondary text-accent",
    };
  }
  if (negative.has(status)) {
    return {
      icon: CircleX,
      className: "border-border bg-muted text-foreground",
    };
  }
  return {
    icon: CircleDashed,
    className: "border-border bg-card text-muted-foreground",
  };
}

export function StatusBadge({ status }: { status: string }) {
  const style = styleFor(status);
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${style.className}`}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={1.9} aria-hidden />
      {formatStatus(status)}
    </span>
  );
}

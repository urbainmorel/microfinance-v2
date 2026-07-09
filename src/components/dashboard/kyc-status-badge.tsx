import { AlertTriangle, CheckCircle2, Clock, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Style = { label: string; icon: LucideIcon; className: string };

// Statut KYC → libellé + couleur (PRD §7.1). Doré pour l'attente, vert pour vérifié,
// encre pour rejeté (jamais de rouge, DESIGN §4.2), toujours doublé d'une icône (§17).
const KYC_BADGE = {
  NONE: { label: "À compléter", icon: Clock, className: "bg-pastel-gold text-warning" },
  PENDING: { label: "Soumis", icon: Clock, className: "bg-pastel-gold text-warning" },
  IN_REVIEW: { label: "En vérification", icon: Clock, className: "bg-pastel-gold text-warning" },
  INFO_REQUESTED: {
    label: "Complément demandé",
    icon: AlertTriangle,
    className: "bg-pastel-gold text-warning",
  },
  COMPLETED: { label: "Vérifié", icon: CheckCircle2, className: "bg-pastel-green text-accent" },
  REJECTED: { label: "Rejeté", icon: AlertTriangle, className: "bg-muted text-foreground" },
} satisfies Record<string, Style>;

export function KycStatusBadge({ status }: { status: string }) {
  const s = KYC_BADGE[status as keyof typeof KYC_BADGE] ?? KYC_BADGE.NONE;
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "mt-2 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
        s.className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.9} aria-hidden />
      {s.label}
    </span>
  );
}

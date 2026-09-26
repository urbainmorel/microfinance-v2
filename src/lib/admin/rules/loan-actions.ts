import type { StaffAction } from "@/components/admin/staff-actions";

export function loanActionsForStatus(status: string): StaffAction[] {
  if (status === "SUBMITTED" || status === "INFO_REQUESTED") {
    return [
      { value: "ANALYZE", label: "Démarrer l’analyse", tone: "accent" },
      { value: "REJECT", label: "Rejeter", requiresReason: true },
    ];
  }
  if (status === "IN_ANALYSIS") {
    return [
      { value: "PRE_APPROVE", label: "Pré-approuver", requiresAmount: true, tone: "accent" },
      {
        value: "REQUEST_INFO",
        label: "Demander un complément",
        requiresReason: true,
        tone: "outline",
      },
      { value: "REJECT", label: "Rejeter", requiresReason: true },
    ];
  }
  if (status === "PRE_APPROVED") {
    return [
      { value: "ACCEPT", label: "Accepter", tone: "accent" },
      { value: "REJECT", label: "Rejeter", requiresReason: true },
    ];
  }
  const ready = status === "GUARANTEE_COMPLETE" || status === "AWAITING_DISBURSEMENT";
  return ready
    ? [{ value: "DISBURSE", label: "Décaisser", requiresReference: true, tone: "accent" }]
    : [];
}

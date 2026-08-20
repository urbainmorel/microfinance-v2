const roleLabels: Record<string, string> = {
  client: "Client",
  admin: "Chef d’agence · Administrateur",
};

const statusLabels: Record<string, string> = {
  NONE: "Non commencé",
  PENDING: "En attente",
  IN_REVIEW: "En vérification",
  COMPLETED: "Validé",
  CONFIRMED: "Confirmé",
  REJECTED: "Rejeté",
  INFO_REQUESTED: "Complément demandé",
  PROCESSING: "En traitement",
  CANCELLED: "Annulé",
  SUBMITTED: "Soumis",
  IN_ANALYSIS: "En analyse",
  PRE_APPROVED: "Pré-approuvé",
  ACCEPTED: "Accepté",
  GUARANTEE_PENDING: "Garantie attendue",
  GUARANTEE_COMPLETE: "Garantie complète",
  AWAITING_DISBURSEMENT: "À décaisser",
  DISBURSED: "Décaissé",
  ACTIVE: "Actif",
  CLOSED: "Clôturé",
  DEFAULTED: "En défaut",
  FREE_SAVINGS: "Épargne libre",
  GUARANTEE: "Garantie",
  REPAYMENT: "Remboursement",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement bancaire",
  CASH: "Espèces",
  INTERNAL: "Portefeuille interne",
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatStatus(value: string): string {
  return statusLabels[value] ?? value.replaceAll("_", " ").toLocaleLowerCase("fr");
}

export function formatRole(value: string | null): string {
  if (!value) return "Chargement…";
  return roleLabels[value] ?? value;
}

export function clientName(
  client: { firstname: string; lastname: string } | null | undefined,
): string {
  if (!client) return "Client inconnu";
  return `${client.firstname} ${client.lastname}`.trim() || "Client inconnu";
}

/**
 * Modèle comptable du portefeuille — SOURCE UNIQUE côté TypeScript (Specs §F, PRD §7.2,
 * DESIGN §11.1). Applique EXACTEMENT les mêmes formules qu'en base (`get_available_balance`)
 * et qu'à l'affichage. L'UI n'invente aucun calcul : elle rend ces valeurs.
 * Montants en entiers FCFA (aucune décimale).
 */
export interface WalletSubAccounts {
  free_savings: number;
  disbursed_loan: number;
  blocked_guarantee: number;
  mandatory_savings: number;
  reserved_amount: number;
}

export interface WalletSummary {
  /** SOLDE_DISPONIBLE = free_savings + disbursed_loan − reserved_amount */
  available: number;
  /** MONTANT_BLOQUE = blocked_guarantee + mandatory_savings */
  blocked: number;
  /** MONTANT_RESERVE = reserved_amount (retenu sur le disponible) */
  reserved: number;
  /** PATRIMOINE = free_savings + disbursed_loan + blocked_guarantee + mandatory_savings */
  netWorth: number;
}

/**
 * Calcule les 4 agrégats du portefeuille à partir des 5 sous-comptes.
 * Le réservé n'est JAMAIS ré-additionné au patrimoine : il est déjà compté dans
 * free_savings / disbursed_loan (Specs §F).
 */
export function computeWalletSummary(w: WalletSubAccounts): WalletSummary {
  return {
    available: w.free_savings + w.disbursed_loan - w.reserved_amount,
    blocked: w.blocked_guarantee + w.mandatory_savings,
    reserved: w.reserved_amount,
    netWorth: w.free_savings + w.disbursed_loan + w.blocked_guarantee + w.mandatory_savings,
  };
}

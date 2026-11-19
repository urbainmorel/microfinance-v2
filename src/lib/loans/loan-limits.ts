import { LOAN_TIERS_PRODUCT_1, LOAN_TIERS_PRODUCT_2 } from "./loan-tier-rules";

/**
 * Fourchette globale des offres de prêt actives.
 * Source unique pour le simulateur, le chatbot et les messages client.
 */
export const MIN_LOAN_AMOUNT = Math.min(...LOAN_TIERS_PRODUCT_1.map((tier) => tier.minAmount));

export const MAX_LOAN_AMOUNT = Math.max(...LOAN_TIERS_PRODUCT_2.map((tier) => tier.maxAmount));

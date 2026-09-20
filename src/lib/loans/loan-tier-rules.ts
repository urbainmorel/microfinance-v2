import { formatFcfa } from "@/lib/format";

import type { LoanProduct } from "@/lib/schemas/loan";

export type DurationTier = {
  minAmount: number;
  maxAmount: number;
  minDuration: number;
  maxDuration: number;
  label?: string;
  recommendedDuration?: number;
};

export type DynamicDurationBounds = {
  minDuration: number;
  maxDuration: number;
  allowedDurations: number[];
  currentTier?: DurationTier;
  helperText: string;
  isRestricted: boolean;
};

/**
 * Paliers de durées dynamiques selon l'Option 1 :
 *
 * Produit 1 (100k - 500k FCFA) :
 * - 100k à 200k  -> 6 à 8 mois
 * - 200k+ à 350k -> 6 à 10 mois
 * - 350k+ à 500k -> 8 à 12 mois
 *
 * Produit 2 (1M - 5M FCFA) :
 * - 1M à 2M      -> 12 à 24 mois (1 à 2 ans)
 * - 2M+ à 3.5M   -> 24 à 36 mois (2 à 3 ans)
 * - 3.5M+ à 5M   -> 36 à 60 mois (3 à 5 ans)
 */

export const LOAN_TIERS_PRODUCT_1: DurationTier[] = [
  {
    minAmount: 100_000,
    maxAmount: 200_000,
    minDuration: 6,
    maxDuration: 8,
    recommendedDuration: 6,
    label: "Court terme (6 à 8 mois)",
  },
  {
    minAmount: 200_001,
    maxAmount: 350_000,
    minDuration: 6,
    maxDuration: 10,
    recommendedDuration: 8,
    label: "Intermédiaire (6 à 10 mois)",
  },
  {
    minAmount: 350_001,
    maxAmount: 500_000,
    minDuration: 8,
    maxDuration: 12,
    recommendedDuration: 12,
    label: "Étalé (8 à 12 mois)",
  },
];

export const LOAN_TIERS_PRODUCT_2: DurationTier[] = [
  {
    minAmount: 1_000_000,
    maxAmount: 2_000_000,
    minDuration: 12,
    maxDuration: 24,
    recommendedDuration: 18,
    label: "1 à 2 ans (12 à 24 mois)",
  },
  {
    minAmount: 2_000_001,
    maxAmount: 3_500_000,
    minDuration: 24,
    maxDuration: 36,
    recommendedDuration: 30,
    label: "2 à 3 ans (24 à 36 mois)",
  },
  {
    minAmount: 3_500_001,
    maxAmount: 5_000_000,
    minDuration: 36,
    maxDuration: 60,
    recommendedDuration: 48,
    label: "3 à 5 ans (36 à 60 mois)",
  },
];

/**
 * Détermine les paliers applicables pour un produit donné.
 * Se base sur le produit (nom ou montant maximum).
 */
export function getTiersForProduct(product?: LoanProduct | null): DurationTier[] {
  if (!product) return [];

  // Si le max_amount est supérieur à 500 000, c'est le Produit 2 (Croissance / Moyen terme)
  if (product.max_amount > 500_000 || product.name.toLowerCase().includes("croissance")) {
    return LOAN_TIERS_PRODUCT_2;
  }

  // Sinon, c'est le Produit 1 (Essentiel / Petit financement)
  return LOAN_TIERS_PRODUCT_1;
}

/**
 * Pas d'incrément de montant par produit :
 * - Produit 1 : pas de 50 000 FCFA
 * - Produit 2 : pas de 500 000 FCFA
 */
export function getAmountStepForProduct(product?: LoanProduct | null): number {
  if (!product) return 50_000;
  if (product.max_amount > 500_000 || product.name.toLowerCase().includes("croissance")) {
    return 500_000;
  }
  return 50_000;
}

/**
 * Génère la liste des montants prédéfinis selon le pas du produit.
 */
export function getQuickAmountOptions(product?: LoanProduct | null): number[] {
  if (!product) return [];
  const step = getAmountStepForProduct(product);
  const min = product.min_amount;
  const max = product.max_amount;
  const options: number[] = [];
  for (let amt = min; amt <= max; amt += step) {
    options.push(amt);
  }
  return options;
}

/**
 * Vérifie si le montant respecte le pas autorisé du produit.
 */
export function validateAmountStep(
  product: LoanProduct | undefined,
  amount: number | string | null | undefined,
): string | null {
  const numericAmount = amount !== null && amount !== undefined ? Number(amount) : NaN;
  if (!product || isNaN(numericAmount) || numericAmount <= 0) return null;
  const step = getAmountStepForProduct(product);
  if (numericAmount % step !== 0) {
    return `Le montant demandé doit être un multiple de ${formatFcfa(step)}.`;
  }
  return null;
}

function resolveTierBounds(
  tiers: DurationTier[],
  numericAmount: number,
  product: LoanProduct,
): DynamicDurationBounds | null {
  const matchedTier = tiers.find(
    (tier) => numericAmount >= tier.minAmount && numericAmount <= tier.maxAmount,
  );
  if (matchedTier) {
    return {
      minDuration: matchedTier.minDuration,
      maxDuration: matchedTier.maxDuration,
      allowedDurations: generateDurationOptions(
        matchedTier.minDuration,
        matchedTier.maxDuration,
        product,
      ),
      currentTier: matchedTier,
      helperText: `Pour ${formatFcfa(numericAmount)}, la durée autorisée est de ${formatDurationDisplay(matchedTier.minDuration)} à ${formatDurationDisplay(matchedTier.maxDuration)}.`,
      isRestricted: true,
    };
  }

  const firstTier = tiers[0];
  if (firstTier && numericAmount < firstTier.minAmount) {
    return {
      minDuration: firstTier.minDuration,
      maxDuration: firstTier.maxDuration,
      allowedDurations: generateDurationOptions(
        firstTier.minDuration,
        firstTier.maxDuration,
        product,
      ),
      currentTier: firstTier,
      helperText: `Montant sous le minimum (${formatFcfa(firstTier.minAmount)}). Durée : ${formatDurationDisplay(firstTier.minDuration)} à ${formatDurationDisplay(firstTier.maxDuration)}.`,
      isRestricted: true,
    };
  }

  const lastTier = tiers[tiers.length - 1];
  if (lastTier && numericAmount > lastTier.maxAmount) {
    return {
      minDuration: lastTier.minDuration,
      maxDuration: lastTier.maxDuration,
      allowedDurations: generateDurationOptions(
        lastTier.minDuration,
        lastTier.maxDuration,
        product,
      ),
      currentTier: lastTier,
      helperText: `Montant au-dessus du plafond (${formatFcfa(lastTier.maxAmount)}). Durée : ${formatDurationDisplay(lastTier.minDuration)} à ${formatDurationDisplay(lastTier.maxDuration)}.`,
      isRestricted: true,
    };
  }

  return null;
}

/**
 * Calcule les bornes de durée dynamiques en fonction du montant demandé et du produit sélectionné.
 */
export function getDynamicDurationBounds(
  product?: LoanProduct | null,
  amount?: number | string | null,
): DynamicDurationBounds {
  if (!product) {
    return {
      minDuration: 1,
      maxDuration: 60,
      allowedDurations: [],
      helperText: "Sélectionnez un produit pour voir les durées autorisées.",
      isRestricted: false,
    };
  }

  const tiers = getTiersForProduct(product);
  const globalMin = product.min_duration_months || 6;
  const globalMax = product.max_duration_months || 12;

  const numericAmount = amount !== null && amount !== undefined ? Number(amount) : NaN;

  // Si pas de montant saisi ou montant non numérique, on affiche les bornes globales du produit
  if (isNaN(numericAmount) || numericAmount <= 0) {
    const defaultDurations = generateDurationOptions(globalMin, globalMax, product);
    return {
      minDuration: globalMin,
      maxDuration: globalMax,
      allowedDurations: defaultDurations,
      helperText: `Durée globale : ${formatDurationDisplay(globalMin)} à ${formatDurationDisplay(globalMax)}. Saisissez un montant pour voir la durée adaptée.`,
      isRestricted: false,
    };
  }

  const tierBounds = resolveTierBounds(tiers, numericAmount, product);
  if (tierBounds) return tierBounds;

  // Repli sécurisé
  const fallbackAllowed = generateDurationOptions(globalMin, globalMax, product);
  return {
    minDuration: globalMin,
    maxDuration: globalMax,
    allowedDurations: fallbackAllowed,
    helperText: `Durée autorisée : ${formatDurationDisplay(globalMin)} à ${formatDurationDisplay(globalMax)}.`,
    isRestricted: false,
  };
}

/**
 * Génère des options de durée pertinentes (pour boutons d'accès rapide).
 * Pour Produit 1 (mois) : tous les mois (6, 7, 8...).
 * Pour Produit 2 (années / semestres) : pas clés (12, 18, 24, 30, 36, 48, 60 mois).
 */
function generateDurationOptions(min: number, max: number, product: LoanProduct): number[] {
  const isLargeProduct = product.max_amount > 500_000 || max > 24;

  if (!isLargeProduct) {
    const options: number[] = [];
    for (let m = min; m <= max; m++) {
      options.push(m);
    }
    return options;
  }

  // Pour produit moyen terme (12 à 60 mois)
  const milestones = [12, 18, 24, 30, 36, 42, 48, 54, 60];
  const filtered = milestones.filter((m) => m >= min && m <= max);

  if (!filtered.includes(min)) filtered.unshift(min);
  if (!filtered.includes(max)) filtered.push(max);

  return Array.from(new Set(filtered)).sort((a, b) => a - b);
}

/**
 * Formate l'affichage d'une durée (ex: "6 mois", "12 mois (1 an)", "24 mois (2 ans)").
 */
export function formatDurationDisplay(months: number): string {
  if (months < 12) {
    return `${months} mois`;
  }
  if (months === 12) {
    return "12 mois (1 an)";
  }
  if (months % 12 === 0) {
    return `${months} mois (${months / 12} ans)`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${months} mois (${years} an${years > 1 ? "s" : ""} ${remainingMonths} mois)`;
}

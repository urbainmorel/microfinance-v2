import { formatFcfa } from "@/lib/format";
import { MAX_LOAN_AMOUNT, MIN_LOAN_AMOUNT } from "@/lib/loans/loan-limits";

const LOAN_KEYWORD_PATTERN =
  /(?:^|[^\p{L}])(pr[êe]t|cr[ée]dit|emprunt(?:er)?|financement|financer)(?![\p{L}])/iu;

const BORROW_INTENT_PATTERN =
  /(?:^|[^\p{L}])(je\s+(?:veux|souhaite|voudrais|aimerais)|j'aimerais|j'ai\s+besoin|besoin\s+d['’]|demande(?:r)?|obtenir)(?![\p{L}])/iu;

const OTHER_MONEY_ACTION_PATTERN =
  /(?:^|[^\p{L}])(retrait|retirer|d[ée]p[ôo]t|d[ée]poser|[ée]pargn(?:er|e)|virement|transfert|rembours(?:er|ement)|payer|[ée]ch[ée]ance)(?![\p{L}])/iu;

const PURCHASE_PATTERN =
  /(?:^|[^\p{L}])(acheter|achat|commander|co[ûu]te|prix|facture)(?![\p{L}])/iu;

const AMOUNT_PATTERN =
  /(?<!\d)(\d{1,3}(?:[ .]\d{3})+|\d+(?:[.,]\d+)?)\s*(millions?|milliard(?:s)?|mille|k|m|md)?(?:\s*(?:fcfa|xof|cfa|f))?(?![\p{L}\d])/giu;

const MULTIPLIERS: Record<string, number> = {
  million: 1_000_000,
  millions: 1_000_000,
  milliard: 1_000_000_000,
  milliards: 1_000_000_000,
  mille: 1_000,
  k: 1_000,
  m: 1_000_000,
  md: 1_000_000_000,
};

const THOUSANDS_SEPARATOR_PATTERN = /[ .]\d{3}/;

function parseBaseValue(raw: string): number {
  const withoutSpaces = raw.replace(/\s/g, "");
  const normalized = /^\d{1,3}(?:\.\d{3})+$/.test(withoutSpaces)
    ? withoutSpaces.replace(/\./g, "")
    : withoutSpaces.replace(",", ".");

  return Number(normalized);
}

function getMultiplier(unit?: string): number {
  return unit ? (MULTIPLIERS[unit.toLowerCase()] ?? 1) : 1;
}

function hasLoanIntent(message: string): boolean {
  if (LOAN_KEYWORD_PATTERN.test(message)) return true;
  return (
    BORROW_INTENT_PATTERN.test(message) &&
    !OTHER_MONEY_ACTION_PATTERN.test(message) &&
    !PURCHASE_PATTERN.test(message)
  );
}

/**
 * Extrait le montant de prêt demandé, sans confondre un retrait, un dépôt,
 * une épargne ou un chiffre d'affaires avec une demande de financement.
 */
export function parseLoanAmountRequest(message: string): number | null {
  const normalized = message.normalize("NFKC");
  if (!hasLoanIntent(normalized)) return null;

  for (const match of normalized.matchAll(AMOUNT_PATTERN)) {
    const raw = match[1];
    if (!raw) continue;

    const base = parseBaseValue(raw);
    if (!Number.isFinite(base)) continue;

    const value = Math.round(base * getMultiplier(match[2]));
    const hasMarker = Boolean(match[2] || match[3] || THOUSANDS_SEPARATOR_PATTERN.test(raw));

    if (!hasMarker && value < 1000) continue;
    if (value > 1_000_000_000_000) continue;

    return value;
  }

  return null;
}

/**
 * Réponse déterministe lorsque le montant demandé sort de la fourchette
 * des offres actives. Retourne null si le montant est dans la fourchette
 * ou si le message ne contient pas de demande de prêt identifiable.
 */
export function getLoanAmountLimitReply(message: string): string | null {
  const amount = parseLoanAmountRequest(message);
  if (amount === null) return null;

  const range = `Nos offres de prêt actuellement disponibles s'étendent de ${formatFcfa(
    MIN_LOAN_AMOUNT,
  )} à ${formatFcfa(MAX_LOAN_AMOUNT)}.`;

  if (amount > MAX_LOAN_AMOUNT) {
    return [
      range,
      `Le Prêt Croissance, notre offre la plus élevée, est plafonné à ${formatFcfa(MAX_LOAN_AMOUNT)}.`,
      `Votre demande de ${formatFcfa(amount)} dépasse ce plafond.`,
    ].join(" ");
  }

  if (amount < MIN_LOAN_AMOUNT) {
    return [
      range,
      `Le Prêt Essentiel démarre à ${formatFcfa(MIN_LOAN_AMOUNT)}.`,
      `Votre demande de ${formatFcfa(amount)} est inférieure à ce seuil.`,
    ].join(" ");
  }

  return null;
}

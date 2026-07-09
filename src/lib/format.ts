/**
 * Formatage monétaire — SOURCE UNIQUE (DESIGN §10, PRD §2.3, Specs §F).
 * FCFA (XOF) : montants ENTIERS, séparateur de milliers = espace insécable,
 * suffixe « FCFA ». Ce module est importé partout ; jamais ré-inliné.
 */
const NBSP = " ";

function groupThousands(absInteger: number): string {
  return Math.abs(absInteger)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** Formate un montant entier FCFA : `formatFcfa(95000)` → `95 000 FCFA`. */
export function formatFcfa(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new Error(`Montant FCFA invalide : ${amount}`);
  }
  const integer = Math.trunc(amount);
  const sign = integer < 0 ? "-" : "";
  return `${sign}${groupThousands(integer)}${NBSP}FCFA`;
}

/**
 * Variante avec signe explicite : `+` pour un montant entrant (rendu en vert côté UI),
 * `-` pour un sortant. Le signe seul ne porte jamais la sémantique (DESIGN §10, §17).
 */
export function formatFcfaSigned(amount: number): string {
  const base = formatFcfa(Math.abs(amount));
  if (amount > 0) return `+${NBSP}${base}`;
  if (amount < 0) return `-${NBSP}${base}`;
  return base;
}

/**
 * Nettoie la description d'un produit de prêt en retirant les mentions « du pilote V1 » ou « dans le pilote V1 ».
 */
export function cleanProductDescription(description?: string | null): string | null {
  if (!description) return null;
  return description
    .replace(/\s+(?:dans|du)\s+(?:le\s+)?pilote\s+V1\.?$/i, ".")
    .replace(/\s+(?:dans|du)\s+(?:le\s+)?pilote\s+V1/gi, "")
    .replace(/\.\.$/, ".");
}

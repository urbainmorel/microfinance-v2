/** Pays de la zone FCFA/UEMOA. */
export const FCFA_COUNTRIES = ["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"] as const;

export type FcfaCountry = (typeof FCFA_COUNTRIES)[number];

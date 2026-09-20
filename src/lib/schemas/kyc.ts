import { z } from "zod";

/** Bucket Storage privé des pièces KYC (RLS « chacun son dossier », chiffré au repos). */
export const KYC_BUCKET = "kyc-documents";

/** 14 pays d'Afrique utilisant le Franc CFA (Zone UEMOA + Zone CEMAC). */
export const FCFA_COUNTRIES = [
  { value: "BJ", label: "Bénin" },
  { value: "BF", label: "Burkina Faso" },
  { value: "CM", label: "Cameroun" },
  { value: "CF", label: "Centrafrique" },
  { value: "CG", label: "Congo" },
  { value: "CI", label: "Côte d’Ivoire" },
  { value: "GA", label: "Gabon" },
  { value: "GW", label: "Guinée-Bissau" },
  { value: "GQ", label: "Guinée équatoriale" },
  { value: "ML", label: "Mali" },
  { value: "NE", label: "Niger" },
  { value: "SN", label: "Sénégal" },
  { value: "TD", label: "Tchad" },
  { value: "TG", label: "Togo" },
] as const;

export const FCFA_COUNTRY_CODES = [
  "BJ",
  "BF",
  "CM",
  "CF",
  "CG",
  "CI",
  "GA",
  "GW",
  "GQ",
  "ML",
  "NE",
  "SN",
  "TD",
  "TG",
] as const;

export type FcfaCountryCode = (typeof FCFA_COUNTRY_CODES)[number];

const COUNTRY_MAP: Record<string, FcfaCountryCode> = {
  BJ: "BJ",
  BF: "BF",
  CM: "CM",
  CF: "CF",
  CG: "CG",
  CI: "CI",
  GA: "GA",
  GW: "GW",
  GQ: "GQ",
  ML: "ML",
  NE: "NE",
  SN: "SN",
  TD: "TD",
  TG: "TG",
  BENIN: "BJ",
  BÉNIN: "BJ",
  "BURKINA FASO": "BF",
  CAMEROUN: "CM",
  CAMEROON: "CM",
  CENTRAFRIQUE: "CF",
  "RÉPUBLIQUE CENTRAFRICAINE": "CF",
  "REPUBLIQUE CENTRAFRICAINE": "CF",
  CONGO: "CG",
  "CONGO (BRAZZAVILLE)": "CG",
  "RÉPUBLIQUE DU CONGO": "CG",
  "REPUBLIQUE DU CONGO": "CG",
  "COTE D'IVOIRE": "CI",
  "CÔTE D'IVOIRE": "CI",
  GABON: "GA",
  "GUINEE-BISSAU": "GW",
  "GUINÉE-BISSAU": "GW",
  "GUINEA-BISSAU": "GW",
  "GUINEE EQUATORIALE": "GQ",
  "GUINÉE ÉQUATORIALE": "GQ",
  "EQUATORIAL GUINEA": "GQ",
  MALI: "ML",
  NIGER: "NE",
  SENEGAL: "SN",
  SÉNÉGAL: "SN",
  TCHAD: "TD",
  CHAD: "TD",
  TOGO: "TG",
};

export function normalizeFcfaCountry(country?: string | null): FcfaCountryCode | undefined {
  if (!country) return undefined;
  return COUNTRY_MAP[country.trim().toUpperCase()];
}

/** Schéma KYC complet (PRD §6.4). Les étapes valident des sous-ensembles de champs. */
export const kycSchema = z.object({
  birth_date: z.string().optional(),
  country: z.enum(FCFA_COUNTRY_CODES, { message: "Veuillez sélectionner un pays" }),
  city: z.string().min(1, "Ville requise"),
  address: z.string().min(1, "Adresse requise"),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide"),
  profession: z.string().min(2, "Profession requise"),
  monthly_income_estimate: z.coerce.number().int().nonnegative("Revenu invalide"),
  id_type: z.enum(["CNI", "PASSPORT", "PERMIS"], { message: "Type de pièce requis" }),
  id_number: z.string().optional(),
  id_expiry: z.string().optional(),
  income_source: z.string().optional(),
  monthly_charges: z.coerce.number().int().nonnegative().optional(),
  momo_operator: z.string().optional(),
  momo_number: z.string().optional(),
  usual_bank: z.string().optional(),
});

export type KycInput = z.infer<typeof kycSchema>;
export type KycField = keyof KycInput;

/** Types de pièces stockées (contrainte CHECK sur kyc_documents.doc_type). */
export const KYC_DOC_TYPES = ["ID_FRONT", "ID_BACK", "SELFIE"] as const;
export type KycDocType = (typeof KYC_DOC_TYPES)[number];

/** Contraintes d'upload (PRD §6.4 : JPG/PNG/PDF, 5 Mo max). */
export const MAX_DOC_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_DOC_MIME = ["image/jpeg", "image/png", "application/pdf"] as const;
export const ACCEPTED_DOC_ATTR = ".jpg,.jpeg,.png,.pdf";

/** Validation d'un fichier de pièce — source unique, réutilisée avant tout upload. */
export const kycDocumentSchema = z
  .instanceof(File, { message: "Fichier requis" })
  .refine((f) => f.size > 0, "Le fichier est vide")
  .refine((f) => f.size <= MAX_DOC_BYTES, "Fichier trop volumineux (5 Mo maximum)")
  .refine(
    (f) => (ACCEPTED_DOC_MIME as readonly string[]).includes(f.type),
    "Format non supporté (JPG, PNG ou PDF)",
  );

/** Étape du wizard : saisie de champs, upload d'une pièce, ou confirmation finale. */
export type KycStep =
  | { title: string; kind: "fields"; target: "profile" | "financials"; fields: readonly KycField[] }
  | { title: string; kind: "upload"; docType: KycDocType; optionalForPassport?: boolean }
  | { title: string; kind: "confirm" };

/** Les 8 sous-étapes du KYC (PRD §6.4). Sauvegarde automatique par étape. */
export const KYC_STEPS = [
  {
    title: "Informations personnelles",
    kind: "fields",
    target: "profile",
    fields: ["country"],
  },
  {
    title: "Adresse & contact",
    kind: "fields",
    target: "profile",
    fields: ["city", "address", "phone"],
  },
  {
    title: "Activité",
    kind: "fields",
    target: "profile",
    fields: ["profession", "monthly_income_estimate"],
  },
  {
    title: "Pièce d'identité",
    kind: "fields",
    target: "profile",
    fields: ["id_type"],
  },
  { title: "Recto de la pièce", kind: "upload", docType: "ID_FRONT" },
  { title: "Verso de la pièce", kind: "upload", docType: "ID_BACK", optionalForPassport: true },
  { title: "Selfie de vérification", kind: "upload", docType: "SELFIE" },
  { title: "Confirmation", kind: "confirm" },
] as const satisfies readonly KycStep[];

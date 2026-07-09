import { z } from "zod";

/** Bucket Storage privé des pièces KYC (RLS « chacun son dossier », chiffré au repos). */
export const KYC_BUCKET = "kyc-documents";

/** Schéma KYC complet (PRD §6.4). Les étapes valident des sous-ensembles de champs. */
export const kycSchema = z.object({
  birth_date: z.string().min(1, "Date de naissance requise"),
  country: z.string().min(2, "Pays de résidence requis"),
  city: z.string().min(1, "Ville requise"),
  address: z.string().min(1, "Adresse requise"),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide"),
  profession: z.string().min(2, "Profession requise"),
  monthly_income_estimate: z.coerce.number().int().nonnegative("Revenu invalide"),
  id_type: z.enum(["CNI", "PASSPORT", "PERMIS"], { message: "Type de pièce requis" }),
  id_number: z.string().min(3, "Numéro de pièce requis"),
  id_expiry: z.string().min(1, "Date d'expiration requise"),
  income_source: z.string().min(2, "Source de revenus requise"),
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

/** Les 9 sous-étapes du KYC (PRD §6.4, 4.1 → 4.9). Sauvegarde automatique par étape. */
export const KYC_STEPS = [
  {
    title: "Informations personnelles",
    kind: "fields",
    target: "profile",
    fields: ["birth_date", "country"],
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
    fields: ["id_type", "id_number", "id_expiry"],
  },
  { title: "Recto de la pièce", kind: "upload", docType: "ID_FRONT" },
  { title: "Verso de la pièce", kind: "upload", docType: "ID_BACK", optionalForPassport: true },
  { title: "Selfie de vérification", kind: "upload", docType: "SELFIE" },
  {
    title: "Informations financières",
    kind: "fields",
    target: "financials",
    fields: ["income_source", "monthly_charges", "momo_operator", "momo_number", "usual_bank"],
  },
  { title: "Confirmation", kind: "confirm" },
] as const satisfies readonly KycStep[];

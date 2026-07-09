import { z } from "zod";

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

/** Étapes du wizard : cible d'enregistrement + champs. (Les uploads viennent avec Storage.) */
export const KYC_STEPS = [
  { title: "Informations personnelles", target: "profile", fields: ["birth_date", "country"] },
  { title: "Adresse & contact", target: "profile", fields: ["city", "address", "phone"] },
  { title: "Activité", target: "profile", fields: ["profession", "monthly_income_estimate"] },
  { title: "Pièce d'identité", target: "profile", fields: ["id_type", "id_number", "id_expiry"] },
  {
    title: "Informations financières",
    target: "financials",
    fields: ["income_source", "monthly_charges", "momo_operator", "momo_number", "usual_bank"],
  },
  { title: "Confirmation", target: "none", fields: [] },
] as const satisfies ReadonlyArray<{
  title: string;
  target: "profile" | "financials" | "none";
  fields: readonly KycField[];
}>;

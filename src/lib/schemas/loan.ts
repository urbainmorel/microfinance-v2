import { z } from "zod";

import { pinSchema } from "@/lib/schemas/auth";
import { operationDocumentSchema } from "@/lib/schemas/operations";

const loanAmountSchema = z.coerce
  .number({ invalid_type_error: "Saisissez un montant" })
  .int("Le montant doit être un nombre entier")
  .positive("Le montant doit être supérieur à zéro");

export const loanSimulationInputSchema = z.object({
  productId: z.string().uuid("Sélectionnez un produit"),
  amount: loanAmountSchema,
  durationMonths: z.coerce
    .number({ invalid_type_error: "Saisissez une durée" })
    .int("La durée doit être un nombre entier")
    .positive("La durée doit être supérieure à zéro"),
  startDate: z.string().min(1, "Date de début requise"),
});

export const loanRequestSchema = loanSimulationInputSchema.extend({
  purpose: z.string().trim().min(5, "Précisez l’objet du prêt").max(500),
  monthlyIncomeEstimate: z.coerce
    .number({ invalid_type_error: "Saisissez votre revenu mensuel" })
    .int("Le revenu doit être un nombre entier")
    .nonnegative("Le revenu ne peut pas être négatif"),
  disbursementMethod: z.enum(["INTERNAL", "MOBILE_MONEY", "BANK_TRANSFER"]).default("INTERNAL"),
  documents: z
    .array(operationDocumentSchema)
    .max(5, "Cinq documents maximum")
    .optional()
    .default([]),
  acceptedTerms: z
    .boolean()
    .refine((accepted) => accepted, "Vous devez accepter les conditions de la demande"),
  pin: pinSchema,
});

export type LoanSimulationInput = z.infer<typeof loanSimulationInputSchema>;
export type LoanRequestInput = z.infer<typeof loanRequestSchema>;

export type LoanProduct = {
  id: string;
  name: string;
  description: string | null;
  min_amount: number;
  max_amount: number;
  min_duration_months: number;
  max_duration_months: number;
  interest_rate: number;
  interest_method: "CONSTANT_INSTALLMENT" | "DEGRESSIVE";
  processing_fee_percent: number;
  processing_fee_flat: number;
  management_fee_percent: number;
  management_fee_flat: number;
  insurance_rate: number;
  guarantee_rate: number;
  mandatory_savings_rate: number;
};

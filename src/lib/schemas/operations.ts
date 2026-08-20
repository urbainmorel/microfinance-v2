import { z } from "zod";

import { pinSchema } from "@/lib/schemas/auth";

export const MAX_OPERATION_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const OPERATION_DOCUMENT_ACCEPT = ".jpg,.jpeg,.png,.pdf";
const ACCEPTED_DOCUMENT_MIME = ["image/jpeg", "image/png", "application/pdf"] as const;

export const operationDocumentSchema = z
  .instanceof(File, { message: "Ajoutez un justificatif" })
  .refine((file) => file.size > 0, "Le fichier est vide")
  .refine(
    (file) => file.size <= MAX_OPERATION_DOCUMENT_BYTES,
    "Le fichier ne doit pas dépasser 10 Mo",
  )
  .refine(
    (file) => (ACCEPTED_DOCUMENT_MIME as readonly string[]).includes(file.type),
    "Format accepté : JPG, PNG ou PDF",
  );

const amountSchema = z.coerce
  .number({ invalid_type_error: "Saisissez un montant" })
  .int("Le montant doit être un nombre entier")
  .positive("Le montant doit être supérieur à zéro");

const optionalReferenceSchema = z.string().trim().max(100, "100 caractères maximum").optional();

export const depositRequestSchema = z.object({
  amount: amountSchema,
  motif: z.enum(["FREE_SAVINGS", "GUARANTEE", "REPAYMENT"], {
    message: "Choisissez la destination du dépôt",
  }),
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY", "BANK_TRANSFER"], {
    message: "Choisissez un moyen de paiement",
  }),
  reference: optionalReferenceSchema,
  proof: operationDocumentSchema,
  certified: z.boolean().refine(Boolean, "Vous devez certifier l'authenticité du justificatif"),
  pin: pinSchema,
});

export type DepositRequestInput = z.infer<typeof depositRequestSchema>;

const withdrawalRequestBaseSchema = z.object({
  type: z.enum(["MOBILE_MONEY", "BANK_TRANSFER"]),
  amount: amountSchema,
  recipientName: z.string().trim().min(2, "Nom du bénéficiaire requis").max(120),
  operator: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  bank: z.string().trim().optional(),
  bankCode: z.string().trim().optional(),
  account: z.string().trim().optional(),
  country: z.enum(["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"]).optional(),
  iban: z.string().trim().optional(),
  motif: z.string().trim().optional(),
  pin: pinSchema,
});

type WithdrawalDraft = z.infer<typeof withdrawalRequestBaseSchema>;

function validateMobileMoney(value: WithdrawalDraft, context: z.RefinementCtx) {
  if (!value.operator) {
    context.addIssue({ code: "custom", path: ["operator"], message: "Opérateur requis" });
  }
  if (!/^\+?[0-9]{8,15}$/.test(value.phone ?? "")) {
    context.addIssue({
      code: "custom",
      path: ["phone"],
      message: "Numéro Mobile Money invalide",
    });
  }
}

function validateBankTransfer(value: WithdrawalDraft, context: z.RefinementCtx) {
  validateBankIdentity(value, context);
  validateBankDestination(value, context);
}

function validateBankIdentity(value: WithdrawalDraft, context: z.RefinementCtx) {
  if (!value.bank) {
    context.addIssue({ code: "custom", path: ["bank"], message: "Banque requise" });
  }
  if (!value.country) {
    context.addIssue({ code: "custom", path: ["country"], message: "Pays UMOA requis" });
  }
  if ((value.bankCode?.length ?? 0) < 2) {
    context.addIssue({ code: "custom", path: ["bankCode"], message: "Code banque requis" });
  }
}

function validateBankDestination(value: WithdrawalDraft, context: z.RefinementCtx) {
  if ((value.account?.length ?? 0) < 5) {
    context.addIssue({
      code: "custom",
      path: ["account"],
      message: "Numéro de compte invalide",
    });
  }
  if (value.iban && !/^[A-Z0-9 ]{10,34}$/i.test(value.iban)) {
    context.addIssue({ code: "custom", path: ["iban"], message: "IBAN invalide" });
  }
  if ((value.motif?.length ?? 0) < 3) {
    context.addIssue({ code: "custom", path: ["motif"], message: "Motif requis" });
  }
}

export const withdrawalRequestSchema = withdrawalRequestBaseSchema.superRefine((value, context) => {
  if (value.type === "MOBILE_MONEY") validateMobileMoney(value, context);
  else validateBankTransfer(value, context);
});

export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;

export const repaymentRequestSchema = z.object({
  loanId: z.string().uuid("Sélectionnez un prêt actif"),
  amount: amountSchema,
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY", "BANK_TRANSFER"], {
    message: "Choisissez un moyen de paiement",
  }),
  reference: optionalReferenceSchema,
  proof: operationDocumentSchema,
  pin: pinSchema,
});

export type RepaymentRequestInput = z.infer<typeof repaymentRequestSchema>;

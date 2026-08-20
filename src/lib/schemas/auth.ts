import { z } from "zod";

/**
 * Schémas Zod d'authentification — SOURCE UNIQUE de validation (Specs §A Écrans 1-2,
 * PRD §4.1). Réutilisés côté formulaire (RHF) et côté serveur (Server Actions / Edge).
 */

export const strongPasswordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .regex(/[A-Z]/, "Au moins une majuscule")
  .regex(/[0-9]/, "Au moins un chiffre");

// Écran 1 — Inscription. Mot de passe : ≥ 8, au moins 1 majuscule et 1 chiffre.
export const registerSchema = z
  .object({
    firstname: z.string().min(2, "Prénom requis (2 caractères minimum)"),
    lastname: z.string().min(2, "Nom requis (2 caractères minimum)"),
    email: z.string().email("Adresse email invalide"),
    password: strongPasswordSchema,
    confirm: z.string(),
    consentAccepted: z.literal(true, {
      errorMap: () => ({ message: "Vous devez accepter la politique de confidentialité" }),
    }),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

// Connexion.
export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const updatePasswordSchema = z
  .object({ password: strongPasswordSchema, confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

// Écran 2 — Code PIN : 4 à 6 chiffres, strictement numériques.
export const pinSchema = z.string().regex(/^\d{4,6}$/, "Le code PIN doit comporter 4 à 6 chiffres");

export const setPinSchema = z
  .object({ pin: pinSchema, confirm: z.string() })
  .refine((d) => d.pin === d.confirm, {
    message: "Les codes PIN ne correspondent pas",
    path: ["confirm"],
  });
export type SetPinInput = z.infer<typeof setPinSchema>;

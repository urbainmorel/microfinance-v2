import { z } from "zod";

/**
 * Variables d'environnement publiques (client + serveur), validées par Zod
 * (CLAUDE.md § Types are the contract). La clé service-role n'est JAMAIS lue ici :
 * elle reste confinée aux Edge Functions / RPC serveur.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function readPublicEnv() {
  // Références statiques : nécessaires pour l'inlining Next des NEXT_PUBLIC_*.
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/** Env publique validée, ou lève si mal configurée (usage serveur/build). */
export function getPublicEnv(): PublicEnv {
  const parsed = readPublicEnv();
  if (!parsed.success) {
    throw new Error(`Variables d'environnement publiques invalides : ${parsed.error.message}`);
  }
  return parsed.data;
}

/** Variante tolérante : null si non configurée (middleware résilient au démarrage). */
export function getPublicEnvSafe(): PublicEnv | null {
  const parsed = readPublicEnv();
  return parsed.success ? parsed.data : null;
}

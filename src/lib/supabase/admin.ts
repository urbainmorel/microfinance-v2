import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * Client Supabase avec privilèges administrateur (clé secrète / service-role).
 * À UTILISER STRICTEMENT CÔTÉ SERVEUR (Route Handlers, Server Actions).
 * Ne jamais importer ou exécuter côté client.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Configuration Supabase admin manquante : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY introuvable.",
    );
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

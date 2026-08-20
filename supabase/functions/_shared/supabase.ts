import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";

function reqEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

/** Client service-role — écritures privilégiées serveur uniquement (pin_hash, compteur). */
export function adminClient(): SupabaseClient {
  return createClient(reqEnv("SUPABASE_URL"), reqEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

/** Identifie l'utilisateur à partir du jeton porté dans l'en-tête Authorization. */
export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const client = createClient(reqEnv("SUPABASE_URL"), reqEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

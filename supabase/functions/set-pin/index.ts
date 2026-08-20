// Edge Function `set-pin` (Specs §D.1) — hachage bcrypt du PIN CÔTÉ SERVEUR uniquement.
// Aucune primitive bcrypt n'est jamais exécutée côté client (CLAUDE.md § Security).
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const userId = await getUserId(req);
  if (!userId) return jsonResponse({ error: "Non authentifié" }, 401);

  const body = await req.json().catch(() => null);
  const pin = body?.pin;
  if (typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) {
    return jsonResponse({ error: "PIN invalide (4 à 6 chiffres)" }, 400);
  }

  const pinHash = await bcrypt.hash(pin, 12);
  const admin = adminClient();
  const { data: profile, error: readError } = await admin
    .from("profiles")
    .select("is_active, pin_hash")
    .eq("id", userId)
    .single<{ is_active: boolean | null; pin_hash: string | null }>();
  if (readError) return jsonResponse({ error: "PIN_SETUP_FAILED" }, 500);
  if (profile.is_active !== true) return jsonResponse({ error: "FORBIDDEN" }, 403);
  if (profile.pin_hash) return jsonResponse({ error: "PIN_ALREADY_CONFIGURED" }, 409);

  const { data: updated, error } = await admin
    .from("profiles")
    .update({ pin_hash: pinHash, pin_attempts: 0, pin_locked_until: null })
    .eq("id", userId)
    .eq("is_active", true)
    .is("pin_hash", null)
    .select("id")
    .maybeSingle();

  if (error) return jsonResponse({ error: error.message }, 500);
  if (!updated) return jsonResponse({ error: "PIN_ALREADY_CONFIGURED" }, 409);
  return jsonResponse({ ok: true });
});

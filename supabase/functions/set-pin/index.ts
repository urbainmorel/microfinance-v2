// Edge Function `set-pin` (Specs §D.1) — hachage bcrypt du PIN CÔTÉ SERVEUR uniquement.
// Aucune primitive bcrypt n'est jamais exécutée côté client (CLAUDE.md § Security).
import * as bcrypt from "bcryptjs";

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
  const { data: updated, error } = await admin.rpc("set_initial_pin_hash", {
    p_user_id: userId,
    p_pin_hash: pinHash,
  });

  if (error?.message.includes("FORBIDDEN")) return jsonResponse({ error: "FORBIDDEN" }, 403);
  if (error) return jsonResponse({ error: "PIN_SETUP_FAILED" }, 500);
  if (!updated) return jsonResponse({ error: "PIN_ALREADY_CONFIGURED" }, 409);
  return jsonResponse({ ok: true });
});

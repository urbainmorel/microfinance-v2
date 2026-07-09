// Edge Function `verify-pin` (Specs §D.1) — vérification CÔTÉ SERVEUR + anti-forçage.
// Compteur de tentatives ; verrouillage croissant au-delà de 5 échecs (PRD §4.4).
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";

const LOCK_THRESHOLD = 5;
const LOCK_STEP_MINUTES = 15;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const userId = await getUserId(req);
  if (!userId) return jsonResponse({ error: "Non authentifié" }, 401);

  const body = await req.json().catch(() => null);
  const pin = body?.pin;
  if (typeof pin !== "string") return jsonResponse({ error: "PIN requis" }, 400);

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("pin_hash, pin_attempts, pin_locked_until")
    .eq("id", userId)
    .single();

  if (!profile?.pin_hash) return jsonResponse({ error: "PIN non configuré" }, 400);

  if (profile.pin_locked_until && new Date(profile.pin_locked_until) > new Date()) {
    return jsonResponse({ error: "PIN verrouillé", locked_until: profile.pin_locked_until }, 423);
  }

  const ok = await bcrypt.compare(pin, profile.pin_hash);
  if (!ok) {
    const attempts = (profile.pin_attempts ?? 0) + 1;
    const lockUntil =
      attempts >= LOCK_THRESHOLD
        ? new Date(
            Date.now() + LOCK_STEP_MINUTES * 60_000 * (attempts - (LOCK_THRESHOLD - 1)),
          ).toISOString()
        : null;
    await admin
      .from("profiles")
      .update({ pin_attempts: attempts, pin_locked_until: lockUntil })
      .eq("id", userId);
    return jsonResponse({ error: "PIN incorrect", attempts }, 401);
  }

  await admin
    .from("profiles")
    .update({ pin_attempts: 0, pin_locked_until: null })
    .eq("id", userId);
  return jsonResponse({ ok: true });
});

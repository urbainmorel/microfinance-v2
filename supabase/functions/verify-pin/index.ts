import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { PinVerificationError, verifyPin } from "../_shared/pin.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "VALIDATION_ERROR", message: "Methode non autorisee" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          Allow: "POST, OPTIONS",
        },
      },
    );
  }

  const userId = await getUserId(req);
  if (!userId) {
    return jsonResponse({ error: "UNAUTHENTICATED", message: "Non authentifie" }, 401);
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !("pin" in body)
  ) {
    return jsonResponse({ error: "PIN_INVALID", message: "PIN requis" }, 400);
  }

  try {
    await verifyPin(adminClient(), userId, (body as { pin: unknown }).pin);
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof PinVerificationError) {
      return jsonResponse(
        {
          error: error.code,
          ...(error.details?.attempts === undefined
            ? {}
            : { attempts: error.details.attempts }),
          ...(error.details?.lockedUntil
            ? { lockedUntil: error.details.lockedUntil }
            : {}),
        },
        error.status,
      );
    }
    return jsonResponse({ error: "VALIDATION_ERROR", message: "Verification impossible" }, 500);
  }
});

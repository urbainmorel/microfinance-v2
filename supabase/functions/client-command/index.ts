import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { PinVerificationError, verifyPin } from "../_shared/pin.ts";
import { adminClient, getUserId } from "../_shared/supabase.ts";
import { commandResult } from "./command-result.ts";
import { dispatchCommand } from "./dispatcher.ts";
import { CommandError, errorResponse, mapRpcError } from "./errors.ts";
import { ACTIONS } from "./types.ts";
import { assertExactKeys, enumValue, isObject, uuid } from "./validation.ts";

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
    return errorResponse(new CommandError("UNAUTHENTICATED", 401, "Non authentifie"));
  }

  const body = await req.json().catch(() => null);
  if (!isObject(body)) {
    return errorResponse(new CommandError("VALIDATION_ERROR", 400, "JSON invalide"));
  }

  try {
    assertExactKeys(body, ["action", "pin", "idempotencyKey", "payload"]);
    const action = enumValue(body.action, ACTIONS);
    const idempotencyKey = uuid(body.idempotencyKey);
    const admin = adminClient();

    await verifyPin(admin, userId, body.pin);

    const correlationId = crypto.randomUUID();
    const command = dispatchCommand(
      action,
      body.payload,
      userId,
      idempotencyKey,
      correlationId,
    );
    const { data, error } = await admin.rpc(command.rpc, command.args);

    if (error) throw mapRpcError(error);
    return jsonResponse(commandResult(data, command, correlationId));
  } catch (error) {
    if (error instanceof PinVerificationError) {
      return errorResponse(
        new CommandError(error.code, error.status, "Verification PIN refusee"),
      );
    }
    if (error instanceof CommandError) return errorResponse(error);
    return errorResponse(
      new CommandError("INVALID_TRANSITION", 500, "Operation impossible"),
    );
  }
});

import { FunctionsHttpError } from "@supabase/supabase-js";

import type { DatabaseClient } from "@/lib/database.types";

export type ClientCommandAction =
  | "deposit.create"
  | "withdrawal.create"
  | "request.cancel"
  | "loan.submit"
  | "loan.contract.sign"
  | "guarantee.block"
  | "repayment.create";

export type ClientCommand = {
  action: ClientCommandAction;
  pin: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
};

export type CommandResult = {
  id: string;
  status: string;
  correlationId: string;
};

type ClientCommandErrorCode =
  | "UNAUTHENTICATED"
  | "PIN_INVALID"
  | "PIN_LOCKED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "INVALID_TRANSITION"
  | "INSUFFICIENT_FUNDS"
  | "ALREADY_PROCESSED"
  | "OUTSIDE_WINDOW";

const ERROR_MESSAGES: Record<ClientCommandErrorCode, string> = {
  UNAUTHENTICATED: "Votre session a expiré. Reconnectez-vous pour continuer.",
  PIN_INVALID: "Le code PIN est incorrect.",
  PIN_LOCKED: "La saisie du PIN est temporairement verrouillée. Réessayez plus tard.",
  FORBIDDEN: "Vous n’êtes pas autorisé à effectuer cette opération.",
  VALIDATION_ERROR: "Les informations transmises sont invalides.",
  INVALID_TRANSITION: "Cette demande ne peut plus être modifiée.",
  INSUFFICIENT_FUNDS: "Votre solde disponible est insuffisant.",
  ALREADY_PROCESSED: "Cette opération a déjà été enregistrée.",
  OUTSIDE_WINDOW: "Les retraits sont traités uniquement entre 8 h et 19 h.",
};

export class ClientCommandError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ClientCommandError";
  }
}

function isCommandResult(value: unknown): value is CommandResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.id === "string" &&
    typeof result.status === "string" &&
    typeof result.correlationId === "string"
  );
}

/** Exécute une commande client atomique : vérification du PIN puis RPC métier côté Edge Function. */
export async function invokeClientCommand(
  supabase: DatabaseClient,
  command: ClientCommand,
): Promise<CommandResult> {
  const { data, error } = await supabase.functions.invoke("client-command", { body: command });

  if (error) {
    let code: string | undefined;
    let serverMessage: string | undefined;

    if (error instanceof FunctionsHttpError) {
      try {
        const body = (await error.context.json()) as {
          error?: string;
          code?: string;
          message?: string;
        };
        code = body.error ?? body.code;
        serverMessage = body.message;
      } catch {
        // La réponse n'est pas du JSON exploitable : utiliser le message générique ci-dessous.
      }
    }

    const knownMessage = code ? ERROR_MESSAGES[code as ClientCommandErrorCode] : undefined;
    throw new ClientCommandError(
      knownMessage ?? serverMessage ?? "L’opération n’a pas pu être enregistrée. Réessayez.",
      code,
    );
  }

  const result =
    data && typeof data === "object" && "data" in data ? (data as { data: unknown }).data : data;
  if (!isCommandResult(result)) {
    throw new ClientCommandError("La réponse du service est incomplète. Réessayez.");
  }
  return result;
}

export async function getAuthenticatedUserId(supabase: DatabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new ClientCommandError(ERROR_MESSAGES.UNAUTHENTICATED, "UNAUTHENTICATED");
  }
  return user.id;
}

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/** Téléverse une preuve privée sous `userId/uuid.ext` et retourne uniquement son chemin Storage. */
export async function uploadClientDocument(
  supabase: DatabaseClient,
  bucket: "deposit-proofs" | "repayment-proofs" | "loan-documents",
  userId: string,
  file: File,
): Promise<string> {
  const originalExtension = file.name.split(".").pop()?.toLowerCase();
  const extension =
    originalExtension && /^[a-z0-9]{2,5}$/.test(originalExtension)
      ? originalExtension
      : (MIME_EXTENSIONS[file.type] ?? "bin");
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new ClientCommandError("Le téléversement du document a échoué. Réessayez.");
  return path;
}

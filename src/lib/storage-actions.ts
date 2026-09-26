import { ClientCommandError } from "@/lib/client-command";

import type { DatabaseClient } from "@/lib/database.types";

const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024; // 10 Mo max

export async function getAuthenticatedUserId(supabase: DatabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new ClientCommandError(
      "Votre session a expiré. Reconnectez-vous pour continuer.",
      "UNAUTHENTICATED",
    );
  }
  return user.id;
}

/** Téléverse une preuve privée sous `userId/uuid.ext` et retourne uniquement son chemin Storage. */
export async function uploadClientDocument(
  supabase: DatabaseClient,
  bucket: "deposit-proofs" | "repayment-proofs" | "loan-documents",
  userId: string,
  file: File,
): Promise<string> {
  const extension = ALLOWED_MIME_EXTENSIONS[file.type];
  if (!extension) {
    throw new ClientCommandError(
      "Format de fichier non autorisé. Formats acceptés : JPG, PNG, WEBP ou PDF.",
      "VALIDATION_ERROR",
    );
  }
  if (!file.size || file.size <= 0 || file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new ClientCommandError("Taille de fichier invalide (10 Mo maximum).", "VALIDATION_ERROR");
  }

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new ClientCommandError("Le téléversement du document a échoué. Réessayez.");
  return path;
}

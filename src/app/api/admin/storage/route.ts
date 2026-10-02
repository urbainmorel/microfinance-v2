import { NextResponse } from "next/server";

import {
  aggregateStorageFiles,
  isFileInRange,
  listAllStorageFiles,
  purgeBucketBatches,
} from "@/lib/admin/storage-crawler";
import { calculateStorageUsage, validateDateRange } from "@/lib/admin/storage-utils";
import { verifySameOrigin } from "@/lib/chatbot/csrf";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { DatabaseClient } from "@/lib/database.types";

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Erreur calcul stockage.";
}

async function verifyAdminAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errorResponse: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      errorResponse: NextResponse.json(
        { error: "Accès réservé aux administrateurs" },
        { status: 403 },
      ),
    };
  }

  return { supabase, user };
}

function parseDateFilter(url: URL) {
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  if (!startDate && !endDate) {
    return { valid: true, startIso: null, endIso: null };
  }
  const validation = validateDateRange(startDate ?? "", endDate ?? "");
  if (!validation.valid) {
    return { valid: false, error: validation.error, startIso: null, endIso: null };
  }
  return { valid: true, startIso: validation.startIso ?? null, endIso: validation.endIso ?? null };
}

async function computeStorageStats(startIso: string | null, endIso: string | null) {
  const adminClient = createSupabaseAdminClient();
  const allFiles = await listAllStorageFiles(adminClient);
  const { totalBytes, matchingBytes, matchingFiles, bucketMap } = aggregateStorageFiles(
    allFiles,
    startIso,
    endIso,
  );
  const usage = calculateStorageUsage(totalBytes);

  return {
    totalBytes,
    totalFiles: allFiles.length,
    quotaBytes: usage.quotaBytes,
    remainingBytes: usage.remainingBytes,
    usedPercentage: usage.usedPercentage,
    matchingFiles,
    matchingBytes,
    buckets: Array.from(bucketMap.entries()).map(([bucketId, b]) => ({
      bucketId,
      bytes: b.bytes,
      files: b.files,
    })),
  };
}

async function executeStoragePurge(
  supabase: DatabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
  startIso: string,
  endIso: string,
) {
  const adminClient = createSupabaseAdminClient();
  const allFiles = await listAllStorageFiles(adminClient);
  const targets = allFiles.filter((f) => isFileInRange(f.createdAt, startIso, endIso));

  const freedBytes = await purgeBucketBatches(adminClient, targets);

  if (targets.length > 0) {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      user_role: "admin",
      action_type: "STORAGE_PURGE",
      reason: `Purge ${targets.length} fichier(s) (${freedBytes} o) du ${startDate} au ${endDate}`,
      old_value: { startDate, endDate, filesCount: targets.length, bytesFreed: freedBytes },
      new_value: { purged: true },
    });
  }

  const remainingFiles = allFiles.filter((f) => !isFileInRange(f.createdAt, startIso, endIso));
  const remainingTotalBytes = remainingFiles.reduce((acc, f) => acc + f.size, 0);
  const usage = calculateStorageUsage(remainingTotalBytes);

  return {
    deletedCount: targets.length,
    freedBytes,
    remainingBytes: usage.remainingBytes,
    usedPercentage: usage.usedPercentage,
  };
}

async function parsePurgePayload(request: Request) {
  try {
    const body = (await request.json()) as { startDate?: string; endDate?: string };
    const startDate = body?.startDate ?? "";
    const endDate = body?.endDate ?? "";
    const validation = validateDateRange(startDate, endDate);
    return { startDate, endDate, validation };
  } catch {
    return {
      startDate: "",
      endDate: "",
      validation: { valid: false, error: "Corps de requête invalide" },
    };
  }
}

export async function GET(request: Request) {
  const auth = await verifyAdminAuth();
  if (auth.errorResponse) return auth.errorResponse;

  const dateFilter = parseDateFilter(new URL(request.url));
  if (!dateFilter.valid) {
    return NextResponse.json({ error: dateFilter.error }, { status: 400 });
  }

  try {
    const { data: rpcData, error: rpcError } = await (
      auth.supabase as unknown as {
        rpc: (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: unknown }>;
      }
    ).rpc("admin_get_storage_stats", {
      p_start_date: dateFilter.startIso,
      p_end_date: dateFilter.endIso,
    });

    if (!rpcError && rpcData) {
      return NextResponse.json(rpcData);
    }

    const fallbackData = await computeStorageStats(dateFilter.startIso, dateFilter.endIso);
    return NextResponse.json(fallbackData);
  } catch (err: unknown) {
    const msg = extractErrorMessage(err);
    console.error("[Admin Storage GET error]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json(
      { error: "Origine de la requête non autorisée (protection CSRF)" },
      { status: 403 },
    );
  }

  const auth = await verifyAdminAuth();
  if (auth.errorResponse) return auth.errorResponse;

  const { startDate, endDate, validation } = await parsePurgePayload(request);
  if (!validation.valid || !validation.startIso || !validation.endIso) {
    return NextResponse.json({ error: validation.error || "Plage invalide." }, { status: 400 });
  }

  try {
    const purgeResult = await executeStoragePurge(
      auth.supabase,
      auth.user.id,
      startDate,
      endDate,
      validation.startIso,
      validation.endIso,
    );
    return NextResponse.json(purgeResult);
  } catch (err: unknown) {
    const { data: rpcData, error: rpcError } = await (
      auth.supabase as unknown as {
        rpc: (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: unknown }>;
      }
    ).rpc("admin_delete_storage_files_in_range", {
      p_start_date: validation.startIso,
      p_end_date: validation.endIso,
    });

    if (!rpcError && rpcData) return NextResponse.json(rpcData);

    const msg = extractErrorMessage(err);
    console.error("[Admin Storage POST error]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

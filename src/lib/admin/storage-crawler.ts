import { chunkArray } from "@/lib/admin/storage-utils";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface StorageFileItem {
  bucket: string;
  name: string;
  size: number;
  createdAt: string;
}

function isFolderItem(item: { id: string | null; metadata?: unknown }): boolean {
  if (item.id !== null) return false;
  return !item.metadata || Object.keys(item.metadata).length === 0;
}

function parseFileItem(
  bucket: string,
  fullPath: string,
  metadata?: unknown,
  createdAt?: string | null,
  updatedAt?: string | null,
): StorageFileItem {
  const meta =
    metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  return {
    bucket,
    name: fullPath,
    size: Number(meta.size) || 0,
    createdAt: createdAt || updatedAt || "",
  };
}

export async function listBucketFiles(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  bucket: string,
  prefix = "",
): Promise<StorageFileItem[]> {
  try {
    const { data, error } = await adminClient.storage.from(bucket).list(prefix, {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error || !data) return [];

    const files: StorageFileItem[] = [];
    const folderWalks: Promise<StorageFileItem[]>[] = [];

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (isFolderItem(item)) {
        folderWalks.push(listBucketFiles(adminClient, bucket, fullPath));
      } else {
        files.push(
          parseFileItem(bucket, fullPath, item.metadata, item.created_at, item.updated_at),
        );
      }
    }

    const subResults = await Promise.all(folderWalks);
    return files.concat(subResults.flat());
  } catch {
    return [];
  }
}

export async function listAllStorageFiles(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
): Promise<StorageFileItem[]> {
  const { data: buckets, error } = await adminClient.storage.listBuckets();
  if (error || !buckets) return [];

  const results = await Promise.all(buckets.map((b) => listBucketFiles(adminClient, b.name)));
  return results.flat();
}

export function isFileInRange(
  createdAt?: string,
  startIso?: string | null,
  endIso?: string | null,
): boolean {
  if (!createdAt || !startIso || !endIso) return false;
  const t = new Date(createdAt).getTime();
  return t >= new Date(startIso).getTime() && t <= new Date(endIso).getTime();
}

export function aggregateStorageFiles(
  files: StorageFileItem[],
  startIso: string | null,
  endIso: string | null,
) {
  let totalBytes = 0;
  let matchingBytes = 0;
  let matchingFiles = 0;
  const bucketMap = new Map<string, { bytes: number; files: number }>();

  for (const file of files) {
    totalBytes += file.size;

    const current = bucketMap.get(file.bucket) ?? { bytes: 0, files: 0 };
    current.bytes += file.size;
    current.files += 1;
    bucketMap.set(file.bucket, current);

    if (isFileInRange(file.createdAt, startIso, endIso)) {
      matchingFiles += 1;
      matchingBytes += file.size;
    }
  }

  return { totalBytes, matchingBytes, matchingFiles, bucketMap };
}

export async function purgeBucketBatches(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  targets: StorageFileItem[],
) {
  const bucketMap = new Map<string, string[]>();
  let freedBytes = 0;

  for (const file of targets) {
    freedBytes += file.size;
    const paths = bucketMap.get(file.bucket) ?? [];
    paths.push(file.name);
    bucketMap.set(file.bucket, paths);
  }

  for (const [bucket, paths] of Array.from(bucketMap.entries())) {
    const batches = chunkArray(paths, 150);
    for (const batch of batches) {
      if (batch.length > 0) {
        await adminClient.storage.from(bucket).remove(batch);
      }
    }
  }

  return freedBytes;
}

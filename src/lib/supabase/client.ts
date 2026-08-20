import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

import type { Database, DatabaseClient } from "@/lib/database.types";

/** Client Supabase navigateur (composants `'use client'`). Jamais d'écriture comptable ici. */
export function createSupabaseBrowserClient(): DatabaseClient {
  const env = getPublicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ) as unknown as DatabaseClient;
}

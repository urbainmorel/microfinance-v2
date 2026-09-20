import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

import type { Database, DatabaseClient } from "@/lib/database.types";

let clientInstance: DatabaseClient | undefined;

/** Client Supabase navigateur unique (composants `'use client'`). Jamais d'écriture comptable ici. */
export function createSupabaseBrowserClient(): DatabaseClient {
  if (!clientInstance) {
    const env = getPublicEnv();
    clientInstance = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ) as unknown as DatabaseClient;
  }
  return clientInstance;
}

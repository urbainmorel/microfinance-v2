import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

/** Client Supabase navigateur (composants `'use client'`). Jamais d'écriture comptable ici. */
export function createSupabaseBrowserClient() {
  const env = getPublicEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

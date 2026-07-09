"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Client Supabase navigateur mémoïsé pour la durée de vie du composant. */
export function useSupabase() {
  const [client] = useState(() => createSupabaseBrowserClient());
  return client;
}

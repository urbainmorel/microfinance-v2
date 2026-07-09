"use client";

import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "@/lib/hooks/use-supabase";

/** Utilisateur authentifié courant (id + email), mis en cache pour la session. */
export function useSessionUser() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["auth-user"],
    staleTime: Infinity,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });
}

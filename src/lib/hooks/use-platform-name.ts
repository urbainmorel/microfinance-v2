"use client";

import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "@/lib/hooks/use-supabase";

export const DEFAULT_PLATFORM_NAME = "Azari Microfinance";

/**
 * Hook pour récupérer dynamiquement le nom de la plateforme configuré par l'administrateur.
 * Repli automatique et gracieux sur 'Azari Microfinance'.
 */
export function usePlatformName(): string {
  const supabase = useSupabase();
  const { data } = useQuery({
    queryKey: ["app_settings", "platform_name"],
    staleTime: 1000 * 60 * 5, // 5 minutes de cache
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("platform_name")
          .eq("id", true)
          .single();

        if (error || !data) return DEFAULT_PLATFORM_NAME;
        const row = data as { platform_name?: string | null };
        return row.platform_name?.trim() || DEFAULT_PLATFORM_NAME;
      } catch {
        return DEFAULT_PLATFORM_NAME;
      }
    },
  });

  return data || DEFAULT_PLATFORM_NAME;
}

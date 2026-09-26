"use client";

import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "@/lib/hooks/use-supabase";

/**
 * Récupère le numéro Mobile Money de dépôt configuré par l'administrateur.
 * Retourne null si aucun numéro n'est configuré ou en cas d'erreur.
 */
export function useDepositPhone(): string | null {
  const supabase = useSupabase();
  const { data } = useQuery({
    queryKey: ["app_settings", "deposit_phone"],
    staleTime: 1000 * 60 * 5, // 5 minutes de cache
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("deposit_phone")
          .eq("id", true)
          .single();
        if (error || !data) return null;
        const row = data as { deposit_phone?: string | null };
        return row.deposit_phone?.trim() || null;
      } catch {
        return null;
      }
    },
  });
  return data ?? null;
}

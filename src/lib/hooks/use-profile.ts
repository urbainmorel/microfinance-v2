"use client";

import { useQuery } from "@tanstack/react-query";

import { useSessionUser } from "@/lib/hooks/use-session-user";
import { useSupabase } from "@/lib/hooks/use-supabase";

export type ProfileHeader = { firstname: string; kyc_status: string };

/** En-tête de profil (PRD §7.1) : prénom + statut KYC, pour le bonjour et le badge. */
export function useProfile() {
  const supabase = useSupabase();
  const { data: user } = useSessionUser();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<ProfileHeader> => {
      const userId = user?.id;
      if (!userId) throw new Error("Utilisateur non identifié");
      const { data, error } = await supabase
        .from("profiles")
        .select("firstname, kyc_status")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data as ProfileHeader;
    },
  });
}

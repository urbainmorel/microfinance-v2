"use client";

import { useQuery } from "@tanstack/react-query";

import { useSessionUser } from "@/lib/hooks/use-session-user";
import { useSupabase } from "@/lib/hooks/use-supabase";

export type PendingGuaranteeDeposit = {
  id: string;
  amount: number;
  status: string | null;
  created_at: string | null;
};

export function usePendingGuaranteeDeposit() {
  const supabase = useSupabase();
  const { data: user } = useSessionUser();

  return useQuery({
    queryKey: ["pending-guarantee-deposit", user?.id],
    enabled: Boolean(user?.id),
    refetchInterval: 10_000,
    queryFn: async (): Promise<PendingGuaranteeDeposit | null> => {
      const userId = user?.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from("deposit_requests")
        .select("id, amount, status, created_at")
        .eq("client_id", userId)
        .eq("motif", "GUARANTEE")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PendingGuaranteeDeposit | null;
    },
  });
}

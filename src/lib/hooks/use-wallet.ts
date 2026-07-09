"use client";

import { useQuery } from "@tanstack/react-query";

import { useSessionUser } from "@/lib/hooks/use-session-user";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { computeWalletSummary, type WalletSubAccounts, type WalletSummary } from "@/lib/wallet";

export type WalletData = { subAccounts: WalletSubAccounts; summary: WalletSummary };

const ZERO: WalletSubAccounts = {
  free_savings: 0,
  disbursed_loan: 0,
  blocked_guarantee: 0,
  mandatory_savings: 0,
  reserved_amount: 0,
};

/**
 * Lecture du portefeuille (Specs §A Écran 3) : RPC `get_wallet_summary` → 5 sous-comptes,
 * agrégats via la formule UNIQUE `computeWalletSummary`. Revalidation 10 s (mises à jour agent).
 * L'UI ne recalcule jamais : elle rend ces valeurs.
 */
export function useWallet() {
  const supabase = useSupabase();
  const { data: user } = useSessionUser();
  return useQuery({
    queryKey: ["wallet", user?.id],
    enabled: Boolean(user?.id),
    refetchInterval: 10_000,
    queryFn: async (): Promise<WalletData> => {
      const userId = user?.id;
      if (!userId) throw new Error("Utilisateur non identifié");
      const { data, error } = await supabase.rpc("get_wallet_summary", { p_client: userId });
      if (error) throw error;
      const rows = (data ?? []) as WalletSubAccounts[];
      const sub = rows[0] ?? ZERO;
      return { subAccounts: sub, summary: computeWalletSummary(sub) };
    },
  });
}

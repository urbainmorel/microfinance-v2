"use client";

import { useQuery } from "@tanstack/react-query";

import { useSessionUser } from "@/lib/hooks/use-session-user";
import { useSupabase } from "@/lib/hooks/use-supabase";

export type ActiveLoanState = {
  displayState: number;
  contractSigned?: boolean;
  loanId?: string;
  requestId?: string;
  status?: string;
  totalAmount?: number;
  remainingPrincipal?: number;
  guaranteeRequired?: number;
  guaranteeBlocked?: number;
  guaranteeSatisfied?: boolean;
  remainingGuarantee?: number;
  freeSavings?: number;
  disbursedLoan?: number;
  withdrawableAmount?: number;
};

export function useActiveLoan(options?: { refetchInterval?: number | false }) {
  const supabase = useSupabase();
  const { data: user } = useSessionUser();
  return useQuery({
    queryKey: ["active-loan-status", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<ActiveLoanState> => {
      const { data, error } = await supabase.rpc("get_active_loan_status");
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as ActiveLoanState;
    },
    refetchInterval: options?.refetchInterval ?? 10_000,
  });
}

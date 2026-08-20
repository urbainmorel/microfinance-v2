"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export const adminKeys = {
  role: ["admin", "role"] as const,
  kpis: ["admin", "kpis"] as const,
  kyc: ["admin", "kyc"] as const,
  deposits: ["admin", "deposits"] as const,
  withdrawals: ["admin", "withdrawals"] as const,
  repayments: ["admin", "repayments"] as const,
  loans: ["admin", "loans"] as const,
  products: ["admin", "products"] as const,
  audit: ["admin", "audit"] as const,
};

export function useAdminMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<void>,
  invalidate: readonly (readonly string[])[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}

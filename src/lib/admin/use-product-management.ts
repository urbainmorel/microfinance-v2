"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  createLoanProduct,
  deactivateLoanProduct,
  getLoanProducts,
  updateLoanProduct,
} from "@/lib/admin/api";
import { adminKeys, useAdminMutation } from "@/lib/admin/hooks";

import type { LoanProduct, LoanProductInput } from "@/lib/admin/types";

type ProductCommand =
  { type: "save"; input: LoanProductInput; id?: string } | { type: "deactivate"; id: string };

async function executeProductCommand(command: ProductCommand) {
  if (command.type === "deactivate") return deactivateLoanProduct(command.id);
  if (command.id) return updateLoanProduct(command.id, command.input);
  return createLoanProduct(command.input);
}

export function useProductManagement() {
  const query = useQuery({ queryKey: adminKeys.products, queryFn: getLoanProducts });
  const [editing, setEditing] = useState<LoanProduct | "new" | null>(null);
  const mutation = useAdminMutation(executeProductCommand, [adminKeys.products]);
  const save = (input: LoanProductInput) => {
    const id = editing !== "new" && editing ? editing.id : undefined;
    mutation.mutate({ type: "save", input, id }, { onSuccess: () => setEditing(null) });
  };
  const deactivate = (id: string) => mutation.mutate({ type: "deactivate", id });
  return { query, editing, setEditing, mutation, save, deactivate };
}

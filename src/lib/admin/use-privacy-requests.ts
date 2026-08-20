"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getDataErasureRequests, processDataErasure } from "@/lib/admin/api";
import { downloadCsv } from "@/lib/admin/csv";

export const PRIVACY_PAGE_SIZE = 25;
export type PrivacyAction = "REJECT" | "ANONYMIZE";
export interface PrivacyCommand {
  requestId: string;
  action: PrivacyAction;
  reason: string;
}

function exportRequests(
  page: number,
  items: Awaited<ReturnType<typeof getDataErasureRequests>>["items"],
) {
  downloadCsv(
    `demandes-donnees-page-${page}.csv`,
    [
      "Identifiant",
      "Utilisateur",
      "Prénom",
      "Nom",
      "Téléphone",
      "Statut",
      "Motif",
      "Créée le",
      "Traitée le",
    ],
    items.map((request) => [
      request.id,
      request.userId,
      request.requester?.firstname,
      request.requester?.lastname,
      request.requester?.phone,
      request.status,
      request.reason,
      request.createdAt,
      request.processedAt,
    ]),
  );
}

export function usePrivacyRequests() {
  const [page, setPage] = useState(1);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "privacy", page],
    queryFn: () => getDataErasureRequests({ page, pageSize: PRIVACY_PAGE_SIZE }),
  });
  const mutation = useMutation({
    mutationFn: (command: PrivacyCommand) =>
      processDataErasure(command.requestId, command.action, command.reason),
    onSuccess: async (_, command) => {
      setReasons((current) => ({ ...current, [command.requestId]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "privacy"] });
    },
  });
  const setReason = (id: string, reason: string) => {
    setReasons((current) => ({ ...current, [id]: reason }));
  };
  const submit = (requestId: string, action: PrivacyAction) => {
    const reason = reasons[requestId]?.trim() ?? "";
    if (!reason || mutation.isPending) return;
    const confirmed =
      action !== "ANONYMIZE" ||
      window.confirm("Anonymiser définitivement les données de ce client ?");
    if (confirmed) mutation.mutate({ requestId, action, reason });
  };
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PRIVACY_PAGE_SIZE));
  return {
    page,
    setPage,
    reasons,
    setReason,
    submit,
    query,
    mutation,
    totalPages,
    exportPage: () => exportRequests(page, query.data?.items ?? []),
  };
}

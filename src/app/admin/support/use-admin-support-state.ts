"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  deleteKnowledgeItem,
  getChatbotSettings,
  getKnowledgeItems,
  getSupportTickets,
  saveChatbotSettings,
  saveKnowledgeItem,
  updateTicketStatus,
} from "@/lib/admin/api-chatbot";

import type { TicketStatus } from "@/lib/chatbot/types";

export type TabId = "knowledge" | "settings" | "live" | "tickets";

export function useAdminSupportState() {
  const [activeTab, setActiveTab] = useState<TabId>("knowledge");
  const qc = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["admin", "chatbot", "settings"],
    queryFn: getChatbotSettings,
  });
  const knowledgeQuery = useQuery({
    queryKey: ["admin", "chatbot", "knowledge"],
    queryFn: getKnowledgeItems,
  });
  const ticketsQuery = useQuery({
    queryKey: ["admin", "chatbot", "tickets"],
    queryFn: getSupportTickets,
  });

  const saveSettings = useMutation({
    mutationFn: saveChatbotSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "chatbot", "settings"] });
      qc.invalidateQueries({ queryKey: ["chatbot", "public-settings"] });
    },
  });

  const saveKnowledge = useMutation({
    mutationFn: saveKnowledgeItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "chatbot", "knowledge"] }),
  });

  const deleteKnowledge = useMutation({
    mutationFn: deleteKnowledgeItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "chatbot", "knowledge"] }),
  });

  const updateTicket = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      updateTicketStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "chatbot", "tickets"] }),
  });

  const queries = [settingsQuery, knowledgeQuery, ticketsQuery];
  const isLoading = queries.some((q) => q.isPending);
  const isError = queries.some((q) => q.isError);
  const errorMsg = queries.find((q) => q.error)?.error?.message;
  const pendingCount = (ticketsQuery.data || []).filter((t) => t.status === "pending").length;

  return {
    activeTab,
    setActiveTab,
    settings: settingsQuery.data,
    knowledge: knowledgeQuery.data || [],
    tickets: ticketsQuery.data || [],
    isLoading,
    isError,
    errorMsg,
    pendingCount,
    saveSettings,
    saveKnowledge,
    deleteKnowledge,
    updateTicket,
  };
}

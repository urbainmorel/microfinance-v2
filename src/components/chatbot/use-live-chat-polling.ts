"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import type { DisplayMessage } from "./chat-message-list";

interface LiveChatPollingParams {
  conversationId: string | null;
  isLiveChat: boolean;
  isOpen: boolean;
  sessionId?: string;
  onStatusChange: (status: string) => void;
  onMessagesReceived: (messages: DisplayMessage[]) => void;
}

export function useLiveChatPolling(params: LiveChatPollingParams) {
  const { conversationId, isLiveChat, isOpen, sessionId, onStatusChange, onMessagesReceived } =
    params;

  const query = useQuery({
    queryKey: ["chatbot", "messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const paramsQuery = new URLSearchParams({
        conversationId,
        sessionId: sessionId || "",
      });
      const res = await fetch(`/api/chat/messages?${paramsQuery.toString()}`);
      if (!res.ok) return null;
      return (await res.json()) as { status: string; messages: DisplayMessage[] };
    },
    enabled: isOpen && Boolean(conversationId) && isLiveChat,
    refetchInterval: isOpen && isLiveChat ? 3000 : false,
  });

  useEffect(() => {
    if (!query.data) return;
    if (query.data.status) onStatusChange(query.data.status);
    if (Array.isArray(query.data.messages) && query.data.messages.length > 0) {
      onMessagesReceived(query.data.messages);
    }
  }, [query.data, onStatusChange, onMessagesReceived]);
}

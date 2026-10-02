"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { useProfile } from "@/lib/hooks/use-profile";
import { useSessionUser } from "@/lib/hooks/use-session-user";

import { useChatActions } from "./use-chat-actions";
import { useLiveChatPolling } from "./use-live-chat-polling";

import type { SubmitData } from "./callback-ticket-modal";
import type { DisplayMessage } from "./chat-message-list";

export interface PublicSettings {
  botName: string;
  botAvatarUrl: string | null;
  primaryColor: string;
  welcomeMessage: string;
  offlineMessage: string;
  suggestedQuestions: string[];
  isAgentOnline: boolean;
  financialDisclaimer: string;
}

function getInitialSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const s = localStorage.getItem("azari_chat_session_id");
    if (s) return s;
  } catch {
    // Ignore storage read errors in restricted contexts
  }
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `sess_${Date.now()}`;
}

function getStoredConversationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("azari_chat_conversation_id");
  } catch {
    return null;
  }
}

function usePersistSessionId(sessionId: string) {
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("azari_chat_session_id");
      if (stored !== sessionId) {
        localStorage.setItem("azari_chat_session_id", sessionId);
      }
    } catch {
      // Ignore storage write errors in private/restricted contexts
    }
  }, [sessionId]);
}

function useChatPublicSettings() {
  return useQuery<PublicSettings>({
    queryKey: ["chatbot", "public-settings"],
    queryFn: async () => {
      const res = await fetch("/api/chat/settings");
      if (!res.ok) throw new Error("Erreur settings");
      return res.json();
    },
    staleTime: 60_000,
  });
}

function buildDisplayedMessages(
  messages: DisplayMessage[],
  welcomeMessage?: string,
): DisplayMessage[] {
  if (messages.length > 0) return messages;
  return welcomeMessage ? [{ id: "w", senderType: "bot", content: welcomeMessage }] : [];
}

export function useChatbotController() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState<string>(getInitialSessionId);
  const [conversationId, setConversationIdState] = useState<string | null>(getStoredConversationId);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [conversationStatus, setConversationStatus] = useState<string>("bot");
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  usePersistSessionId(sessionId);

  const setConversationId = useCallback((id: string | null) => {
    setConversationIdState(id);
    if (typeof window === "undefined") return;
    try {
      if (id) sessionStorage.setItem("azari_chat_conversation_id", id);
      else sessionStorage.removeItem("azari_chat_conversation_id");
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const { data: user, isLoading: isLoadingUser } = useSessionUser();
  const { data: profile } = useProfile();
  const defaultClientName = !isLoadingUser && user ? profile?.firstname || user.email || "" : "";
  const { data: settings } = useChatPublicSettings();

  const isLiveChat =
    conversationStatus === "waiting_agent" || conversationStatus === "agent_active";

  useLiveChatPolling({
    conversationId,
    isLiveChat,
    isOpen,
    sessionId,
    onStatusChange: setConversationStatus,
    onMessagesReceived: setMessages,
  });

  const { isThinking, handleSendMessage, handleEscalate } = useChatActions({
    sessionId,
    conversationId,
    clientName: defaultClientName,
    setConversationId,
    setConversationStatus,
    setMessages,
    setIsTicketModalOpen,
  });

  const handleTicketSubmit = async (data: SubmitData) => {
    await fetch("/api/support/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, conversationId }),
    });
    setConversationStatus("ticket_created");
  };

  const displayedMessages = buildDisplayedMessages(messages, settings?.welcomeMessage);

  return {
    isOpen,
    setIsOpen,
    settings,
    displayedMessages,
    isThinking,
    conversationStatus,
    isTicketModalOpen,
    setIsTicketModalOpen,
    handleSendMessage,
    handleEscalate,
    handleTicketSubmit,
    defaultClientName,
  };
}

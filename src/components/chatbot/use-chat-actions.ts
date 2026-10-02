"use client";

import { useCallback, useMemo, useState } from "react";

import type { DisplayMessage } from "./chat-message-list";

interface ChatActionProps {
  sessionId: string;
  conversationId: string | null;
  clientName: string;
  setConversationId: (id: string) => void;
  setConversationStatus: (status: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
  setIsTicketModalOpen: (open: boolean) => void;
}

interface ApiResponseData {
  conversationId?: string;
  status?: string;
  content?: string | null;
}

function applyChatResponse(
  data: ApiResponseData,
  msgSender: "bot" | "system",
  setters: {
    setConversationId: (id: string) => void;
    setConversationStatus: (status: string) => void;
    setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
    setIsTicketModalOpen: (open: boolean) => void;
  },
) {
  if (data.conversationId) setters.setConversationId(data.conversationId);
  if (data.status) setters.setConversationStatus(data.status);
  if (data.content) {
    setters.setMessages((p) => [
      ...p,
      {
        id: `${msgSender === "bot" ? "b" : "s"}_${Date.now()}`,
        senderType: msgSender,
        content: data.content as string,
      },
    ]);
  }
  if (data.status === "callback_ticket") setters.setIsTicketModalOpen(true);
}

export function useChatActions(props: ChatActionProps) {
  const {
    sessionId,
    conversationId,
    clientName,
    setConversationId,
    setConversationStatus,
    setMessages,
    setIsTicketModalOpen,
  } = props;
  const [isThinking, setIsThinking] = useState(false);
  const setters = useMemo(
    () => ({ setConversationId, setConversationStatus, setMessages, setIsTicketModalOpen }),
    [setConversationId, setConversationStatus, setMessages, setIsTicketModalOpen],
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!sessionId || !text.trim()) return;
      setMessages((p) => [
        ...p,
        {
          id: `u_${Date.now()}`,
          senderType: "user",
          senderName: clientName || "Visiteur",
          content: text,
        },
      ]);
      setIsThinking(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId, conversationId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || "Erreur de traitement.";
          setMessages((p) => [
            ...p,
            { id: `e_${Date.now()}`, senderType: "system", content: errMsg },
          ]);
          return;
        }
        const data = (await res.json()) as ApiResponseData;
        applyChatResponse(data, "bot", setters);
      } catch {
        setMessages((p) => [
          ...p,
          { id: `e_${Date.now()}`, senderType: "system", content: "Erreur réseau." },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [sessionId, conversationId, clientName, setMessages, setters],
  );

  const handleEscalate = useCallback(async () => {
    if (!sessionId) return;
    setIsThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, conversationId, forceEscalate: true }),
      });
      if (!res.ok) {
        setIsTicketModalOpen(true);
        return;
      }
      const data = (await res.json()) as ApiResponseData;
      applyChatResponse(data, "system", setters);
    } catch {
      setIsTicketModalOpen(true);
    } finally {
      setIsThinking(false);
    }
  }, [sessionId, conversationId, setIsTicketModalOpen, setters]);

  return { isThinking, handleSendMessage, handleEscalate };
}

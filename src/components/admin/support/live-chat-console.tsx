"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Headphones, MessageSquare, Send, User } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import {
  getConversationMessages,
  getSupportConversations,
  resolveConversation,
  sendAgentMessage,
} from "@/lib/admin/api-chatbot";

import type { SupportConversation, SupportMessage } from "@/lib/chatbot/types";

interface QueueProps {
  conversations: SupportConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function ConversationQueue({ conversations, selectedId, onSelect }: QueueProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Headphones className="size-4 text-accent" />
          <h3 className="font-display text-sm font-bold text-foreground">File d’Attente Live</h3>
        </div>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
          {conversations.length} active(s)
        </span>
      </div>

      {conversations.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <CheckCircle2 className="size-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-xs font-medium text-foreground">Aucun client en attente</p>
          <p className="text-[11px] text-muted-foreground">
            Les demandes de mise en relation directe apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const isSelected = c.id === selectedId;
            const isWaiting = c.status === "waiting_agent";
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-accent bg-secondary/80 text-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted/40"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-xs font-semibold">
                    Session {c.sessionId.slice(-6)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isWaiting
                        ? "animate-pulse border border-red-200 bg-red-100 text-red-700"
                        : "border border-emerald-200 bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {isWaiting ? "En attente" : "En direct"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Dernier message : {new Date(c.lastMessageAt).toLocaleTimeString()}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
}

function ChatInput({ onSendMessage }: ChatInputProps) {
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;
    try {
      setIsSending(true);
      await onSendMessage(replyText.trim());
      setReplyText("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-t border-border bg-card p-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Répondre directement au client en temps réel…"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!replyText.trim() || isSending}
          className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

interface ChatAreaProps {
  conversation?: SupportConversation;
  messages: SupportMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onResolve: () => Promise<void>;
}

function ConversationChatArea({ conversation, messages, onSendMessage, onResolve }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-20 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <MessageSquare className="size-6" />
        </div>
        <h4 className="mt-3 font-display text-sm font-bold text-foreground">
          Sélectionnez une discussion
        </h4>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Cliquez sur une session active à gauche pour dialoguer en direct avec l&apos;emprunteur.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-secondary text-xs font-semibold text-accent">
            <User className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              Discussion #{conversation.id.slice(0, 8)}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Statut :{" "}
              {conversation.status === "waiting_agent"
                ? "En attente d'un agent"
                : "Agent en direct"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onResolve}
          className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Clôturer la discussion
        </button>
      </div>

      <div className="scrollbar-subtle flex-1 space-y-3 overflow-y-auto bg-muted/10 p-4">
        {messages.map((m) => {
          const isUser = m.senderType === "user";
          const isAgent = m.senderType === "agent";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2 ${isUser ? "flex-row" : "flex-row-reverse"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  isUser
                    ? "border border-border bg-card text-foreground"
                    : isAgent
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <p className="mb-0.5 text-[10px] font-bold opacity-80">
                  {isUser ? m.senderName || "Client" : isAgent ? "Vous (Conseiller)" : "Système"}
                </p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSendMessage={onSendMessage} />
    </>
  );
}

export function LiveChatConsole() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const { data: conversations = [], refetch: refetchConvs } = useQuery<SupportConversation[]>({
    queryKey: ["admin", "support", "conversations"],
    queryFn: getSupportConversations,
    refetchInterval: 5000,
  });

  const activeConversations = conversations.filter(
    (c) => c.status === "waiting_agent" || c.status === "agent_active",
  );

  const { data: messages = [], refetch: refetchMessages } = useQuery<SupportMessage[]>({
    queryKey: ["admin", "support", "messages", selectedConvId],
    queryFn: () => (selectedConvId ? getConversationMessages(selectedConvId) : []),
    enabled: Boolean(selectedConvId),
    refetchInterval: selectedConvId ? 3000 : false,
  });

  const handleSendMessage = async (content: string) => {
    if (!selectedConvId) return;
    await sendAgentMessage({
      conversationId: selectedConvId,
      content,
      agentName: "Conseiller de crédit",
    });
    await refetchMessages();
    await refetchConvs();
  };

  const handleResolve = async () => {
    if (!selectedConvId) return;
    await resolveConversation(selectedConvId);
    await refetchConvs();
    setSelectedConvId(null);
  };

  const currentConv = conversations.find((c) => c.id === selectedConvId);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ConversationQueue
        conversations={activeConversations}
        selectedId={selectedConvId}
        onSelect={setSelectedConvId}
      />
      <div className="flex min-h-[500px] flex-col rounded-2xl border border-border bg-card shadow-card lg:col-span-2">
        <ConversationChatArea
          conversation={currentConv}
          messages={messages}
          onSendMessage={handleSendMessage}
          onResolve={handleResolve}
        />
      </div>
    </div>
  );
}

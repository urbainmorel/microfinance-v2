"use client";

import { CheckCircle2, Headphones, User } from "lucide-react";
import { useEffect, useRef } from "react";

import { BrandSymbol } from "@/components/brand/brand-symbol";

import type { SupportSenderType } from "@/lib/chatbot/types";

export interface DisplayMessage {
  id: string;
  senderType: SupportSenderType;
  senderName?: string | null;
  content: string;
  createdAt?: string;
}

interface ChatMessageListProps {
  messages: DisplayMessage[];
  isThinking?: boolean;
  botName?: string;
}

function MessageAvatar({ senderType }: { senderType: SupportSenderType }) {
  if (senderType === "user") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent text-xs text-accent-foreground">
        <User className="size-3.5" />
      </div>
    );
  }
  if (senderType === "agent") {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-50 text-xs text-emerald-700">
        <Headphones className="size-3.5" />
      </div>
    );
  }
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-foreground">
      <BrandSymbol size={16} />
    </div>
  );
}

function MessageBubble({ msg, botName }: { msg: DisplayMessage; botName: string }) {
  if (msg.senderType === "system") {
    return (
      <div className="my-2 flex justify-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3 shrink-0 text-success" />
          <span>{msg.content}</span>
        </div>
      </div>
    );
  }

  const isUser = msg.senderType === "user";
  const isAgent = msg.senderType === "agent";

  return (
    <div className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <MessageAvatar senderType={msg.senderType} />
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-tr-none bg-accent text-accent-foreground"
            : isAgent
              ? "rounded-tl-none border border-emerald-500/20 bg-emerald-50/60 text-foreground"
              : "rounded-tl-none border border-border bg-card text-foreground"
        }`}
      >
        {!isUser ? (
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
            {isAgent ? msg.senderName || "Conseiller en direct" : botName}
          </p>
        ) : null}
        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
      </div>
    </div>
  );
}

export function ChatMessageList({
  messages,
  isThinking = false,
  botName = "Assistant Azari",
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Historique des messages"
      className="scrollbar-subtle flex-1 space-y-4 overflow-y-auto p-4 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
    >
      <div role="log" aria-live="polite" aria-relevant="additions text" className="space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} botName={botName} />
        ))}
      </div>

      {isThinking ? (
        <div role="status" aria-live="polite" className="flex items-start gap-2.5">
          <MessageAvatar senderType="bot" />
          <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none border border-border bg-card px-4 py-3 shadow-sm">
            <span className="sr-only">L&apos;assistant est en train d&apos;écrire...</span>
            <span
              aria-hidden="true"
              className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]"
            />
            <span
              aria-hidden="true"
              className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]"
            />
            <span aria-hidden="true" className="size-1.5 animate-bounce rounded-full bg-accent" />
          </div>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}

"use client";

import { Headphones, ShieldAlert, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { BrandSymbol } from "@/components/brand/brand-symbol";

import { ChatInput } from "./chat-input";
import { ChatMessageList, type DisplayMessage } from "./chat-message-list";

interface ChatWindowProps {
  onClose: () => void;
  messages: DisplayMessage[];
  onSendMessage: (message: string) => void;
  onEscalate: () => void;
  isThinking?: boolean;
  botName?: string;
  suggestedQuestions?: string[];
  financialDisclaimer?: string;
  conversationStatus?: string;
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function trapTabKey(event: KeyboardEvent, panel: HTMLDivElement) {
  const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (!focusable.length) {
    event.preventDefault();
    panel.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

function ChatWindowHeader({
  botName,
  conversationStatus,
  onEscalate,
  onClose,
}: {
  botName: string;
  conversationStatus: string;
  onEscalate: () => void;
  onClose: () => void;
}) {
  const isAgentActive = conversationStatus === "agent_active";
  const isWaitingAgent = conversationStatus === "waiting_agent";
  const isLiveChat = isAgentActive || isWaitingAgent;

  const statusLabel = isAgentActive
    ? "Conseiller en direct"
    : isWaitingAgent
      ? "Demande transmise"
      : "Assistance Azari";
  const dotClass = isAgentActive ? "animate-pulse bg-emerald-500" : "bg-accent";

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3.5 sm:rounded-t-2xl">
      <div className="flex items-center gap-3">
        <div className="shadow-xs grid size-9 place-items-center rounded-xl border border-border bg-white">
          <BrandSymbol size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-display text-sm font-bold text-foreground">{botName}</h2>
          <div className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${dotClass}`} />
            <span className="truncate text-[11px] font-medium text-muted-foreground">
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!isLiveChat ? (
          <button
            type="button"
            onClick={onEscalate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-accent"
          >
            <Headphones className="size-3.5 text-accent" />
            <span className="hidden sm:inline">Conseiller</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la discussion"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function ChatWindow({
  onClose,
  messages,
  onSendMessage,
  onEscalate,
  isThinking = false,
  botName = "Assistant Azari",
  suggestedQuestions = [],
  financialDisclaimer = "",
  conversationStatus = "bot",
}: ChatWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Retenir l'élément déclencheur pour restaurer le focus à la fermeture
    const triggerElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Focus initial automatique sur le champ de saisie
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && windowRef.current) {
        trapTabKey(e, windowRef.current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      triggerElement?.focus();
    };
  }, [onClose]);

  return (
    <div
      ref={windowRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Fenêtre de discussion avec ${botName}`}
      className="fixed bottom-0 right-0 z-50 flex h-dvh w-full flex-col overscroll-contain border-border bg-card shadow-lift sm:bottom-24 sm:right-6 sm:h-[620px] sm:max-h-[85vh] sm:w-[400px] sm:rounded-2xl sm:border"
    >
      <ChatWindowHeader
        botName={botName}
        conversationStatus={conversationStatus}
        onEscalate={onEscalate}
        onClose={onClose}
      />

      {conversationStatus === "waiting_agent" ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground"
        >
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          <span>Votre demande a été transmise à l&apos;équipe compétente.</span>
        </div>
      ) : null}

      <ChatMessageList messages={messages} isThinking={isThinking} botName={botName} />

      <ChatInput
        inputRef={inputRef}
        autoFocus
        onSend={onSendMessage}
        disabled={isThinking}
        suggestedQuestions={messages.length <= 1 ? suggestedQuestions : []}
      />

      {financialDisclaimer ? (
        <div className="flex items-center gap-1.5 border-t border-border/50 bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground">
          <ShieldAlert className="size-2.5 shrink-0 opacity-70" />
          <span className="truncate">{financialDisclaimer}</span>
        </div>
      ) : null}
    </div>
  );
}

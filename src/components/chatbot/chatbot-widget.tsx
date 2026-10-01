"use client";

import { MessageSquareText } from "lucide-react";

import { CallbackTicketModal } from "./callback-ticket-modal";
import { ChatWindow } from "./chat-window";
import { useChatbotController } from "./use-chatbot-controller";

export function ChatbotWidget() {
  const ctrl = useChatbotController();

  const isOnline = Boolean(ctrl.settings?.isAgentOnline);
  const botName = ctrl.settings?.botName || "Assistant Azari";
  const questions = ctrl.settings?.suggestedQuestions || [];
  const disclaimer = ctrl.settings?.financialDisclaimer || "";

  return (
    <>
      {ctrl.isOpen ? (
        <ChatWindow
          onClose={() => ctrl.setIsOpen(false)}
          messages={ctrl.displayedMessages}
          onSendMessage={ctrl.handleSendMessage}
          onEscalate={ctrl.handleEscalate}
          isThinking={ctrl.isThinking}
          botName={botName}
          isAgentOnline={isOnline}
          suggestedQuestions={questions}
          financialDisclaimer={disclaimer}
          conversationStatus={ctrl.conversationStatus}
        />
      ) : null}

      <CallbackTicketModal
        open={ctrl.isTicketModalOpen}
        onClose={() => ctrl.setIsTicketModalOpen(false)}
        onSubmit={ctrl.handleTicketSubmit}
        defaultName={ctrl.defaultClientName}
      />

      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => ctrl.setIsOpen((prev) => !prev)}
          aria-label={ctrl.isOpen ? "Fermer le support" : "Ouvrir l'assistant support"}
          className="group relative flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lift hover:scale-105 active:scale-95"
        >
          <MessageSquareText className="size-6 transition-transform group-hover:rotate-3" />
          <span
            className={`absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-card ${
              isOnline ? "animate-pulse bg-emerald-500" : "bg-accent-soft"
            }`}
            title={isOnline ? "Conseillers en ligne" : "Assistant IA disponible"}
          />
        </button>
      </div>
    </>
  );
}

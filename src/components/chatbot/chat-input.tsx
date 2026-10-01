"use client";

import { Send } from "lucide-react";
import { type FormEvent, type RefObject, useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  suggestedQuestions?: string[];
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
}

export function ChatInput({
  onSend,
  disabled = false,
  suggestedQuestions = [],
  placeholder = "Posez votre question…",
  inputRef,
  autoFocus,
}: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {suggestedQuestions.length > 0 ? (
        <div className="scrollbar-subtle -mx-1 mb-2.5 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => onSend(q)}
              className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/60 px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-secondary hover:text-accent disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Votre message"
          className="min-h-10 flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 sm:text-sm"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          aria-label="Envoyer le message"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:hover:scale-100"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

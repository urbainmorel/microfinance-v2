"use client";

import { SlidersHorizontal } from "lucide-react";

import type { ChatbotSettings, ResponseLength } from "@/lib/chatbot/types";

interface BehaviorCardProps {
  responseLength: ChatbotSettings["responseLength"];
  customInstructions: string;
  onResponseLengthChange: (val: ResponseLength) => void;
  onCustomInstructionsChange: (val: string) => void;
}

const LENGTH_OPTIONS = [
  {
    id: "concise" as const,
    title: "Concis",
    badge: "~250 tokens",
    desc: "1 à 2 paragraphes. Idéal pour mobile et réponses directes.",
  },
  {
    id: "balanced" as const,
    title: "Équilibré",
    badge: "~600 tokens",
    desc: "Format actuel. Bon compromis explicatif.",
  },
  {
    id: "detailed" as const,
    title: "Détaillé",
    badge: "~1200 tokens",
    desc: "Explications complètes sur les barèmes et démarches.",
  },
];

function ResponseLengthSelector({
  currentLength,
  onSelect,
}: {
  currentLength: ResponseLength;
  onSelect: (val: ResponseLength) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {LENGTH_OPTIONS.map((opt) => {
        const selected = currentLength === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            aria-pressed={selected}
            className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
              selected
                ? "shadow-xs border-accent bg-accent/10 ring-1 ring-accent"
                : "border-input bg-background hover:border-accent/40 hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">{opt.title}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                  selected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {opt.badge}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{opt.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

export function BehaviorCard({
  responseLength,
  customInstructions,
  onResponseLengthChange,
  onCustomInstructionsChange,
}: BehaviorCardProps) {
  const currentLength = responseLength || "balanced";
  const lengthChars = customInstructions?.length || 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
        <SlidersHorizontal className="size-4 text-accent" />
        <h3 className="font-display text-sm font-bold text-foreground">
          Longueur de Réponse & Consignes Spécifiques
        </h3>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-xs font-semibold text-foreground">
            Longueur maximale de la réponse de l’assistant
          </label>
          <ResponseLengthSelector currentLength={currentLength} onSelect={onResponseLengthChange} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">
              Consignes spécifiques sur la manière de répondre (Prompt Système)
            </label>
            <span
              className={`text-[11px] ${
                lengthChars >= 1900 ? "font-bold text-amber-600" : "text-muted-foreground"
              }`}
            >
              {lengthChars} / 2000 caractères
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={2000}
            value={customInstructions}
            onChange={(e) => onCustomInstructionsChange(e.target.value)}
            placeholder="Ex. : Toujours accueillir avec courtoisie. Orienter en priorité vers le Microcrédit Express ou le Prêt TPE/PME d'Azari. Préciser que le dépôt de garantie de 10% est restitué à 100% à terme."
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ces consignes sont intégrées directement au prompt système pour piloter le comportement,
            le ton et les priorités de réponse de l’assistant IA d’Azari.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Clock, MessageSquare, Palette, ShieldCheck, UserCheck } from "lucide-react";

import { AVAILABLE_LLM_MODELS, type ChatbotSettings } from "@/lib/chatbot/types";

interface AvailabilityCardProps {
  isOnline: boolean;
  onChange: (val: boolean) => void;
}

export function AvailabilityCard({ isOnline, onChange }: AvailabilityCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`grid size-10 place-items-center rounded-xl text-white ${
              isOnline ? "bg-emerald-600" : "bg-muted-foreground"
            }`}
          >
            <UserCheck className="size-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              Disponibilité des Conseillers (Live Chat)
            </h3>
            <p className="text-xs text-muted-foreground">
              Active la prise en charge des clients en direct dans le chat.
            </p>
          </div>
        </div>

        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={isOnline}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <div className="peer-focus:outline-hidden peer h-7 w-14 rounded-full bg-muted-foreground/30 transition-colors after:absolute after:left-[4px] after:top-[4px] after:size-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-7" />
          <span className="ml-3 text-xs font-bold uppercase tracking-wider text-foreground">
            {isOnline ? "En ligne" : "Absent"}
          </span>
        </label>
      </div>
    </div>
  );
}

interface ModelCardProps {
  modelName: string;
  aiTone: ChatbotSettings["aiTone"];
  customModel: string;
  onModelChange: (model: string) => void;
  onCustomModelChange: (val: string) => void;
  onToneChange: (tone: ChatbotSettings["aiTone"]) => void;
}

export function ModelCard({
  modelName,
  aiTone,
  customModel,
  onModelChange,
  onCustomModelChange,
  onToneChange,
}: ModelCardProps) {
  const isPredefined = AVAILABLE_LLM_MODELS.some((m) => m.id === modelName);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
        <ShieldCheck className="size-4 text-accent" />
        <h3 className="font-display text-sm font-bold text-foreground">Modèle d’IA (OpenRouter)</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            Sélectionnez le modèle LLM
          </label>
          <select
            value={isPredefined ? modelName : "custom"}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {(["Qwen", "Google", "Mistral", "DeepSeek"] as const).map((cat) => (
              <optgroup key={cat} label={cat}>
                {AVAILABLE_LLM_MODELS.filter((m) => m.category === cat).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — ({m.cost})
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="custom">Saisir un autre identifiant OpenRouter…</option>
          </select>
        </div>

        {!isPredefined || customModel ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Identifiant exact du modèle OpenRouter
            </label>
            <input
              type="text"
              value={customModel || modelName}
              onChange={(e) => onCustomModelChange(e.target.value)}
              placeholder="Ex: meta-llama/llama-3.3-70b-instruct"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Ton de l’assistant
          </label>
          <select
            value={aiTone}
            onChange={(e) => onToneChange(e.target.value as ChatbotSettings["aiTone"])}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="institutional">Institutionnel & Rigoureux (Standard bancaire)</option>
            <option value="warm">Chaleureux & Pédagogue (Accessible & empathique)</option>
            <option value="strict">Strict & Factuel (Conformité & synthèse)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

interface BrandingCardProps {
  botName: string;
  primaryColor: string;
  onBotNameChange: (val: string) => void;
  onPrimaryColorChange: (val: string) => void;
}

export function BrandingCard({
  botName,
  primaryColor,
  onBotNameChange,
  onPrimaryColorChange,
}: BrandingCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
        <Palette className="size-4 text-accent" />
        <h3 className="font-display text-sm font-bold text-foreground">
          Identité Visuelle & Marque Blanche
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Nom de l’assistant
          </label>
          <input
            type="text"
            required
            value={botName}
            onChange={(e) => onBotNameChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Couleur Primaire (Hex)
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => onPrimaryColorChange(e.target.value)}
              className="size-10 cursor-pointer rounded-xl border border-input bg-background p-1"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => onPrimaryColorChange(e.target.value)}
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessagesCardProps {
  welcomeMessage: string;
  offlineMessage: string;
  questionsText: string;
  financialDisclaimer: string;
  onWelcomeChange: (val: string) => void;
  onOfflineChange: (val: string) => void;
  onQuestionsChange: (val: string) => void;
  onDisclaimerChange: (val: string) => void;
}

export function MessagesCard({
  welcomeMessage,
  offlineMessage,
  questionsText,
  financialDisclaimer,
  onWelcomeChange,
  onOfflineChange,
  onQuestionsChange,
  onDisclaimerChange,
}: MessagesCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
        <MessageSquare className="size-4 text-accent" />
        <h3 className="font-display text-sm font-bold text-foreground">
          Messages & Parcours Visiteur
        </h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Message d’accueil
          </label>
          <textarea
            rows={2}
            required
            value={welcomeMessage}
            onChange={(e) => onWelcomeChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Message d’absence / hors horaires (Proposition de rappel)
          </label>
          <textarea
            rows={2}
            required
            value={offlineMessage}
            onChange={(e) => onOfflineChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Questions suggérées (1 question par ligne)
          </label>
          <textarea
            rows={3}
            value={questionsText}
            onChange={(e) => onQuestionsChange(e.target.value)}
            placeholder={"Comment obtenir un micro-prêt ?\nQuels sont vos taux d'épargne ?"}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Avertissement financier légal (Disclaimer)
          </label>
          <input
            type="text"
            value={financialDisclaimer}
            onChange={(e) => onDisclaimerChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>
    </div>
  );
}

interface HoursCardProps {
  start: string;
  end: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
}

export function HoursCard({ start, end, onStartChange, onEndChange }: HoursCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
        <Clock className="size-4 text-accent" />
        <h3 className="font-display text-sm font-bold text-foreground">
          Plages Horaires d’Ouverture de l’Agence
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Heure d’ouverture
          </label>
          <input
            type="time"
            step="1"
            value={start}
            onChange={(e) => onStartChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Heure de fermeture
          </label>
          <input
            type="time"
            step="1"
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

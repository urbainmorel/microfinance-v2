"use client";

import { type FormEvent, useState } from "react";

import { BehaviorCard } from "./chatbot-behavior-card";
import {
  AvailabilityCard,
  BrandingCard,
  HoursCard,
  MessagesCard,
  ModelCard,
} from "./chatbot-settings-sections";

import type { ChatbotSettings } from "@/lib/chatbot/types";

interface ChatbotSettingsFormProps {
  initial: ChatbotSettings;
  busy: boolean;
  onSave: (values: ChatbotSettings) => void;
}

export function ChatbotSettingsForm({ initial, busy, onSave }: ChatbotSettingsFormProps) {
  const [value, setValue] = useState<ChatbotSettings>(initial);
  const [questionsText, setQuestionsText] = useState(initial.suggestedQuestions.join("\n"));
  const [customModel, setCustomModel] = useState("");

  const handleModelChange = (selected: string) => {
    if (selected === "custom") {
      setCustomModel(value.modelName);
    } else {
      setValue((prev) => ({ ...prev, modelName: selected }));
      setCustomModel("");
    }
  };

  const update = <K extends keyof ChatbotSettings>(key: K, val: ChatbotSettings[K]) =>
    setValue((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedQuestions = questionsText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    onSave({
      ...value,
      suggestedQuestions: parsedQuestions,
      modelName: customModel.trim() || value.modelName,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AvailabilityCard
        isOnline={value.isAgentOnline}
        onChange={(val) => update("isAgentOnline", val)}
      />
      <ModelCard
        modelName={value.modelName}
        aiTone={value.aiTone}
        customModel={customModel}
        onModelChange={handleModelChange}
        onCustomModelChange={setCustomModel}
        onToneChange={(tone) => update("aiTone", tone)}
      />
      <BehaviorCard
        responseLength={value.responseLength}
        customInstructions={value.customInstructions || ""}
        onResponseLengthChange={(len) => update("responseLength", len)}
        onCustomInstructionsChange={(inst) => update("customInstructions", inst)}
      />
      <BrandingCard
        botName={value.botName}
        primaryColor={value.primaryColor}
        onBotNameChange={(name) => update("botName", name)}
        onPrimaryColorChange={(col) => update("primaryColor", col)}
      />
      <MessagesCard
        welcomeMessage={value.welcomeMessage}
        offlineMessage={value.offlineMessage}
        questionsText={questionsText}
        financialDisclaimer={value.financialDisclaimer}
        onWelcomeChange={(wm) => update("welcomeMessage", wm)}
        onOfflineChange={(om) => update("offlineMessage", om)}
        onQuestionsChange={setQuestionsText}
        onDisclaimerChange={(fd) => update("financialDisclaimer", fd)}
      />
      <HoursCard
        start={value.businessHoursStart}
        end={value.businessHoursEnd}
        onStartChange={(st) => update("businessHoursStart", st)}
        onEndChange={(nd) => update("businessHoursEnd", nd)}
      />

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}

import { describe, expect, it } from "vitest";

import { TRANSFER_TO_TEAM_REPLY } from "./chatbot-messages";
import {
  canConnectLiveAgent,
  evaluateHandOffRouting,
  isWithinBusinessHours,
} from "./hand-off-service";

import type { ChatbotSettings } from "./types";

const mockSettings: ChatbotSettings = {
  id: true,
  botName: "Assistant Azari",
  botAvatarUrl: null,
  primaryColor: "#077BAD",
  modelName: "qwen/qwen-2.5-72b-instruct",
  welcomeMessage: "Bonjour",
  offlineMessage: "Laissez votre numéro, nous vous rappellerons dès l'ouverture.",
  suggestedQuestions: [],
  aiTone: "institutional",
  financialDisclaimer: "",
  isAgentOnline: true,
  businessHoursStart: "08:30:00",
  businessHoursEnd: "17:30:00",
  businessDays: [1, 2, 3, 4, 5], // Lundi au Vendredi
  responseLength: "balanced",
  customInstructions: null,
  updatedAt: new Date().toISOString(),
};

describe("hand-off-service", () => {
  it("valide les heures ouvrées en semaine (heure d'Abidjan)", () => {
    // Mercredi 10h00 UTC = 10h00 à Abidjan (Mercredi = 3)
    const wednesdayMorning = new Date("2026-10-07T10:00:00Z");
    expect(isWithinBusinessHours(mockSettings, wednesdayMorning)).toBe(true);
  });

  it("rejette les heures hors créneaux d'ouverture", () => {
    // Mercredi 07h00 UTC = 07h00 à Abidjan (avant ouverture)
    const wednesdayEarly = new Date("2026-10-07T07:00:00Z");
    expect(isWithinBusinessHours(mockSettings, wednesdayEarly)).toBe(false);

    // Mercredi 19h00 UTC = 19h00 à Abidjan (après fermeture)
    const wednesdayLate = new Date("2026-10-07T19:00:00Z");
    expect(isWithinBusinessHours(mockSettings, wednesdayLate)).toBe(false);
  });

  it("rejette le week-end", () => {
    // Dimanche 12h00 UTC = 12h00 à Abidjan
    const sunday = new Date("2026-10-11T12:00:00Z");
    expect(isWithinBusinessHours(mockSettings, sunday)).toBe(false);
  });

  it("ne prétend jamais qu'un conseiller est en ligne, même s'il est disponible", () => {
    const wednesdayMorning = new Date("2026-10-07T10:00:00Z");
    expect(canConnectLiveAgent(mockSettings, wednesdayMorning)).toBe(true);

    const routing = evaluateHandOffRouting(mockSettings, wednesdayMorning);
    expect(routing.mode).toBe("live_chat");
    expect(routing.message).toBe(TRANSFER_TO_TEAM_REPLY);
    expect(routing.message).not.toMatch(/en ligne|mise en relation/i);
  });

  it("aiguille vers la demande de rappel si l'agent est absent ou hors horaires", () => {
    const offlineSettings = { ...mockSettings, isAgentOnline: false };
    const wednesdayMorning = new Date("2026-10-07T10:00:00Z");

    expect(canConnectLiveAgent(offlineSettings, wednesdayMorning)).toBe(false);

    const routing = evaluateHandOffRouting(offlineSettings, wednesdayMorning);
    expect(routing.mode).toBe("callback_ticket");
    expect(routing.message).toBe(offlineSettings.offlineMessage);
  });
});

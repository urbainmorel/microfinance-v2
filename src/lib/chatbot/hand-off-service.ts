import type { ChatbotSettings } from "./types";

/**
 * Vérifie si la date/heure actuelle se situe dans les plages d'ouverture de l'agence.
 */
export function isWithinBusinessHours(
  settings: Pick<ChatbotSettings, "businessHoursStart" | "businessHoursEnd" | "businessDays">,
  date = new Date(),
): boolean {
  // getDay(): 0 = Dimanche, 1 = Lundi ... 6 = Samedi
  const jsDay = date.getDay();
  const dayNumber = jsDay === 0 ? 7 : jsDay; // Convertit Dimanche en 7

  if (!settings.businessDays.includes(dayNumber)) {
    return false;
  }

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const currentTime = `${hours}:${minutes}:${seconds}`;

  return currentTime >= settings.businessHoursStart && currentTime <= settings.businessHoursEnd;
}

/**
 * Détermine si un conseiller humain est actuellement disponible pour un Live Chat direct.
 */
export function canConnectLiveAgent(
  settings: Pick<
    ChatbotSettings,
    "isAgentOnline" | "businessHoursStart" | "businessHoursEnd" | "businessDays"
  >,
  date = new Date(),
): boolean {
  return settings.isAgentOnline && isWithinBusinessHours(settings, date);
}

export type HandOffRouting =
  | {
      mode: "live_chat";
      message: string;
    }
  | {
      mode: "callback_ticket";
      message: string;
    };

/**
 * Aiguillage déterministe entre Option 1 (Live Chat) et Option 2 (Demande de rappel).
 */
export function evaluateHandOffRouting(
  settings: ChatbotSettings,
  now = new Date(),
): HandOffRouting {
  const isAvailable = canConnectLiveAgent(settings, now);

  if (isAvailable) {
    return {
      mode: "live_chat",
      message:
        "Un conseiller de notre équipe est en ligne. Je vous mets en relation directe, veuillez patienter un instant...",
    };
  }

  return {
    mode: "callback_ticket",
    message: settings.offlineMessage,
  };
}

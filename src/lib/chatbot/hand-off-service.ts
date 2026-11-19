import { TRANSFER_TO_TEAM_REPLY } from "./chatbot-messages";

import type { ChatbotSettings } from "./types";

/**
 * Horloge de l'agence : Africa/Abidjan est à UTC+0 toute l'année (pas d'heure d'été).
 * On ne dépend donc pas du fuseau du serveur, qui peut différer (UTC+1 en local, UTC en CI).
 */
function getAbidjanDayAndTime(date: Date): { dayNumber: number; time: string } {
  // getUTCDay(): 0 = Dimanche, 1 = Lundi ... 6 = Samedi
  const jsDay = date.getUTCDay();
  const pad = (value: number) => value.toString().padStart(2, "0");

  return {
    dayNumber: jsDay === 0 ? 7 : jsDay,
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`,
  };
}

const DAY_NAMES = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export function formatBusinessHours(
  settings: Pick<ChatbotSettings, "businessDays" | "businessHoursStart" | "businessHoursEnd">,
): string {
  const days = [...settings.businessDays]
    .sort((a, b) => a - b)
    .map((day) => DAY_NAMES[day])
    .filter(Boolean);
  const formatTime = (value: string) => value.slice(0, 5).replace(":", "h");

  if (days.length === 0) return "Les horaires de l'agence ne sont pas renseignés.";
  return `L'agence est ouverte ${days.join(", ")} de ${formatTime(
    settings.businessHoursStart,
  )} à ${formatTime(settings.businessHoursEnd)} (heure d'Abidjan).`;
}

/**
 * Vérifie si la date/heure actuelle se situe dans les plages d'ouverture de l'agence.
 */
export function isWithinBusinessHours(
  settings: Pick<ChatbotSettings, "businessHoursStart" | "businessHoursEnd" | "businessDays">,
  date = new Date(),
): boolean {
  const { dayNumber, time } = getAbidjanDayAndTime(date);

  if (!settings.businessDays.includes(dayNumber)) {
    return false;
  }

  return time >= settings.businessHoursStart && time <= settings.businessHoursEnd;
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
      message: TRANSFER_TO_TEAM_REPLY,
    };
  }

  return {
    mode: "callback_ticket",
    message: settings.offlineMessage,
  };
}

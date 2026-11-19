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
      message:
        "Un conseiller de notre équipe est en ligne. Je vous mets en relation directe, veuillez patienter un instant...",
    };
  }

  return {
    mode: "callback_ticket",
    message: settings.offlineMessage,
  };
}

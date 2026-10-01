import type { ChatMessage, EscalateToHumanArgs } from "./types";

export const ESCALATE_TOOL = {
  type: "function",
  function: {
    name: "escalate_to_human",
    description:
      "Transférer la conversation à un conseiller humain ou initier une demande de rappel si le client le demande expressément, ou si sa question est complexe, sensible, litigieuse ou nécessite une étude personnalisée.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Motif succinct du transfert vers un conseiller humain",
        },
        summary: {
          type: "string",
          description:
            "Synthèse claire de la demande du client et des informations recueillies pour le conseiller",
        },
        urgency: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Degré d'urgence perçu",
        },
        loanAmountRequested: {
          type: "number",
          description: "Montant estimatif du prêt souhaité si précisé par le client",
        },
        loanPurpose: {
          type: "string",
          description: "Activité ou objet du financement souhaité",
        },
      },
      required: ["reason", "summary"],
    },
  },
} as const;

const TIMEOUT_MS = 15000;
const DEFAULT_FALLBACK_MODEL = "google/gemini-2.5-flash";

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY non configurée.");
  }
  return key;
}

function getHeaders(title = "Assistant Virtuel"): Record<string, string> {
  const apiKey = getApiKey();
  const appUrl = process.env.APP_URL || "https://azari-microfinance.site";
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": appUrl,
    "X-Title": title,
  };
}

/**
 * Génère l'empreinte vectorielle d'un texte via OpenRouter (openai/text-embedding-3-small).
 */
export async function createEmbedding(
  text: string,
  model = "openai/text-embedding-3-small",
): Promise<number[]> {
  const cleanInput = text.replace(/[\r\n\x00-\x1f\x7f]/g, " ").trim();
  if (!cleanInput) return [];

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: getHeaders("Embeddings Service"),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model,
      input: cleanInput,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("OpenRouter Embeddings Error:", res.status, errorText);
    throw new Error(`Erreur génération embedding: ${res.statusText}`);
  }

  const json = await res.json();
  const vector = json.data?.[0]?.embedding;
  if (!Array.isArray(vector)) {
    throw new Error("Format d'embedding inattendu de l'API OpenRouter");
  }

  return vector as number[];
}

export interface ChatCompletionResult {
  content: string;
  toolCall?: {
    name: string;
    args: EscalateToHumanArgs;
  } | null;
}

function parseToolCall(
  message: Record<string, unknown> | undefined,
): ChatCompletionResult["toolCall"] {
  const toolCalls = message?.tool_calls;
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return null;

  const firstCall = toolCalls[0] as { function?: { name?: string; arguments?: string } };
  if (firstCall.function?.name !== "escalate_to_human") return null;

  try {
    const parsedArgs = JSON.parse(firstCall.function.arguments || "{}") as EscalateToHumanArgs;
    return { name: "escalate_to_human", args: parsedArgs };
  } catch (err) {
    console.warn("Échec parsing arguments tool_call escalate_to_human:", err);
    return {
      name: "escalate_to_human",
      args: { reason: "Demande d'assistance directe", summary: "Mise en relation demandée" },
    };
  }
}

async function requestOpenRouter(params: {
  messages: ChatMessage[];
  model: string;
  temperature: number;
}): Promise<Record<string, unknown>> {
  const { messages, model, temperature } = params;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: getHeaders("Assistant Chat"),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: 800,
      messages,
      tools: [ESCALATE_TOOL],
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter (${res.status}): ${errText}`);
  }

  return (await res.json()) as Record<string, unknown>;
}

/**
 * Exécute une complétion de chat avec support du Tool Calling et fallback résilient.
 */
export async function executeChatCompletion(params: {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  fallbackModel?: string;
}): Promise<ChatCompletionResult> {
  const { messages, model, temperature = 0.3, fallbackModel = DEFAULT_FALLBACK_MODEL } = params;

  let data: Record<string, unknown>;
  try {
    data = await requestOpenRouter({ messages, model, temperature });
  } catch (primaryErr) {
    console.warn(`Modèle principal ${model} en échec, bascule sur ${fallbackModel}:`, primaryErr);
    data = await requestOpenRouter({ messages, model: fallbackModel, temperature });
  }

  const choices = data.choices as Array<{ message?: Record<string, unknown> }> | undefined;
  const message = choices?.[0]?.message;

  return {
    content: (message?.content as string) || "",
    toolCall: parseToolCall(message),
  };
}

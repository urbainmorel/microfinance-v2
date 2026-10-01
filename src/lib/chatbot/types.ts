export type AiTone = "institutional" | "warm" | "strict";

export type SupportSenderType = "user" | "bot" | "agent" | "system";

export type ConversationStatus =
  "bot" | "waiting_agent" | "agent_active" | "resolved" | "ticket_created";

export type TicketStatus = "pending" | "contacted" | "converted" | "closed";

export interface ChatbotSettings {
  id: boolean;
  botName: string;
  botAvatarUrl: string | null;
  primaryColor: string;
  modelName: string;
  welcomeMessage: string;
  offlineMessage: string;
  suggestedQuestions: string[];
  aiTone: AiTone;
  financialDisclaimer: string;
  isAgentOnline: boolean;
  businessHoursStart: string; // HH:MM:SS
  businessHoursEnd: string; // HH:MM:SS
  businessDays: number[]; // 1=Lundi, 7=Dimanche
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
  embedding?: number[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  similarity?: number;
}

export interface SupportConversation {
  id: string;
  userId: string | null;
  sessionId: string;
  status: ConversationStatus;
  assignedAgentId: string | null;
  lastMessageAt: string;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderType: SupportSenderType;
  senderName: string | null;
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  conversationId: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  loanAmountRequested: number | null;
  loanPurpose: string | null;
  conversationSummary: string;
  status: TicketStatus;
  handledBy: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  senderType?: SupportSenderType;
  senderName?: string;
  timestamp?: string;
}

export interface EscalateToHumanArgs {
  reason: string;
  summary: string;
  urgency?: "low" | "medium" | "high";
  loanAmountRequested?: number;
  loanPurpose?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Catalogue des modèles sélectionnés pour le support client & la rentabilité.
 * Exclut formellement les modèles GPT et Claude conformément aux spécifications.
 */
export const AVAILABLE_LLM_MODELS = [
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B (Recommandé - Équilibré & Puissant)",
    category: "Qwen",
    cost: "Très économique",
  },
  {
    id: "qwen/qwen-2.5-14b-instruct",
    name: "Qwen 2.5 14B (Ultra-rapide)",
    category: "Qwen",
    cost: "Quasi gratuit",
  },
  {
    id: "qwen/qwen-2.5-7b-instruct:free",
    name: "Qwen 2.5 7B Free (100% Gratuit)",
    category: "Qwen",
    cost: "Gratuit",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash (Éprouvé dans l'app)",
    category: "Google",
    cost: "Très économique",
  },
  {
    id: "google/gemini-flash-1.5-8b",
    name: "Gemini Flash 1.5 8B (Mini-latence)",
    category: "Google",
    cost: "Coût plancher",
  },
  {
    id: "mistralai/mistral-small-24b-instruct-2501",
    name: "Mistral Small 24B (Excellence française & Finance)",
    category: "Mistral",
    cost: "Économique",
  },
  {
    id: "mistralai/mistral-nemo",
    name: "Mistral Nemo 12B (Concis)",
    category: "Mistral",
    cost: "Économique",
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B Free (100% Gratuit)",
    category: "Mistral",
    cost: "Gratuit",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3 (Analytique à prix plancher)",
    category: "DeepSeek",
    cost: "Microscopique",
  },
  {
    id: "deepseek/deepseek-chat:free",
    name: "DeepSeek Chat Free (100% Gratuit)",
    category: "DeepSeek",
    cost: "Gratuit",
  },
] as const;

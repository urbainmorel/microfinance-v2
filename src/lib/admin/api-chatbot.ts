import { adminSupabase, asRecord, callRpc, rows } from "./api-client";

import type {
  ChatbotSettings,
  KnowledgeItem,
  SupportConversation,
  SupportMessage,
  SupportTicket,
  TicketStatus,
} from "@/lib/chatbot/types";

function strVal(val: unknown, fallback: string): string {
  return typeof val === "string" && val.length > 0 ? val : fallback;
}

function parseSettings(row: Record<string, unknown>): ChatbotSettings {
  const defaultQuestions = [
    "Comment obtenir un micro-prêt ?",
    "Quels sont vos taux d'épargne ?",
    "Quelles pièces fournir pour le KYC ?",
  ];

  return {
    id: true,
    botName: strVal(row.bot_name, "Assistant Azari"),
    botAvatarUrl: (row.bot_avatar_url as string) || null,
    primaryColor: strVal(row.primary_color, "#077BAD"),
    modelName: strVal(row.model_name, "qwen/qwen-2.5-72b-instruct"),
    welcomeMessage: strVal(
      row.welcome_message,
      "Bonjour ! Comment puis-je vous renseigner sur nos offres de crédit et d'épargne ?",
    ),
    offlineMessage: strVal(
      row.offline_message,
      "Nos conseillers sont actuellement indisponibles. Laissez-nous vos coordonnées, nous vous recontacterons dès l'ouverture.",
    ),
    suggestedQuestions: Array.isArray(row.suggested_questions)
      ? (row.suggested_questions as string[])
      : defaultQuestions,
    aiTone: (row.ai_tone as ChatbotSettings["aiTone"]) || "institutional",
    financialDisclaimer: strVal(
      row.financial_disclaimer,
      "Les simulations et explications fournies par l'assistant sont informatives et ne constituent pas une offre contractuelle de prêt.",
    ),
    isAgentOnline: Boolean(row.is_agent_online),
    businessHoursStart: strVal(row.business_hours_start, "08:00:00"),
    businessHoursEnd: strVal(row.business_hours_end, "17:30:00"),
    businessDays: Array.isArray(row.business_days)
      ? (row.business_days as number[])
      : [1, 2, 3, 4, 5],
    updatedAt: strVal(row.updated_at, new Date().toISOString()),
  };
}

export async function getChatbotSettings(): Promise<ChatbotSettings> {
  const { data, error } = await adminSupabase
    .from("chatbot_settings")
    .select("*")
    .eq("id", true)
    .single();

  if (error) throw new Error(error.message);
  return parseSettings(asRecord(data));
}

export async function saveChatbotSettings(values: Partial<ChatbotSettings>): Promise<void> {
  await callRpc("update_chatbot_settings", { p_values: values });
}

export async function getKnowledgeItems(): Promise<KnowledgeItem[]> {
  const { data, error } = await adminSupabase
    .from("knowledge_items")
    .select("id, title, category, content, is_active, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return rows(data).map((row) => ({
    id: String(row.id),
    title: String(row.title || ""),
    category: String(row.category || "Général"),
    content: String(row.content || ""),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  }));
}

export async function saveKnowledgeItem(item: {
  id?: string;
  title: string;
  category: string;
  content: string;
  isActive?: boolean;
}): Promise<void> {
  const res = await fetch("/api/admin/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Impossible d'enregistrer la fiche de connaissances.");
  }
}

export async function deleteKnowledgeItem(id: string): Promise<void> {
  const res = await fetch(`/api/admin/knowledge?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Impossible de supprimer la fiche.");
  }
}

function parseAmount(val: unknown): number | null {
  if (typeof val === "number") return val;
  if (!val) return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : num;
}

function mapTicketRow(row: Record<string, unknown>): SupportTicket {
  return {
    id: String(row.id),
    conversationId: (row.conversation_id as string) || null,
    clientName: String(row.client_name || ""),
    clientPhone: String(row.client_phone || ""),
    clientEmail: (row.client_email as string) || null,
    loanAmountRequested: parseAmount(row.loan_amount_requested),
    loanPurpose: (row.loan_purpose as string) || null,
    conversationSummary: String(row.conversation_summary || ""),
    status: (row.status as TicketStatus) || "pending",
    handledBy: (row.handled_by as string) || null,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

export async function getSupportTickets(): Promise<SupportTicket[]> {
  const { data, error } = await adminSupabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return rows(data).map(mapTicketRow);
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<void> {
  const {
    data: { user },
  } = await adminSupabase.auth.getUser();

  const { error } = await adminSupabase
    .from("support_tickets")
    .update({
      status,
      handled_by: user?.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function getSupportConversations(): Promise<SupportConversation[]> {
  const { data, error } = await adminSupabase
    .from("support_conversations")
    .select("*")
    .order("last_message_at", { ascending: false });

  if (error) throw new Error(error.message);

  return rows(data).map((row) => ({
    id: String(row.id),
    userId: (row.user_id as string) || null,
    sessionId: String(row.session_id || ""),
    status: (row.status as SupportConversation["status"]) || "bot",
    assignedAgentId: (row.assigned_agent_id as string) || null,
    lastMessageAt: String(row.last_message_at || ""),
    createdAt: String(row.created_at || ""),
  }));
}

export async function getConversationMessages(conversationId: string): Promise<SupportMessage[]> {
  const { data, error } = await adminSupabase
    .from("support_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return rows(data).map((row) => ({
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderType: (row.sender_type as SupportMessage["senderType"]) || "user",
    senderName: (row.sender_name as string) || null,
    content: String(row.content || ""),
    metadata: (row.metadata as Record<string, unknown>) || null,
    createdAt: String(row.created_at || ""),
  }));
}

export async function sendAgentMessage(params: {
  conversationId: string;
  content: string;
  agentName?: string;
}): Promise<void> {
  const { conversationId, content, agentName = "Conseiller" } = params;

  const { error: msgError } = await adminSupabase.from("support_messages").insert({
    conversation_id: conversationId,
    sender_type: "agent",
    sender_name: agentName,
    content,
  });

  if (msgError) throw new Error(msgError.message);

  await adminSupabase
    .from("support_conversations")
    .update({
      status: "agent_active",
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}

export async function resolveConversation(conversationId: string): Promise<void> {
  const { error } = await adminSupabase
    .from("support_conversations")
    .update({
      status: "resolved",
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (error) throw new Error(error.message);
}

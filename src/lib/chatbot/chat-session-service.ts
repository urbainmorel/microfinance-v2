import { NextResponse } from "next/server";

import { evaluateHandOffRouting } from "@/lib/chatbot/hand-off-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import type { ChatCompletionResult } from "@/lib/chatbot/openrouter";
import type { ClientContext } from "@/lib/chatbot/rag-service";
import type { ChatbotSettings, ChatMessage } from "@/lib/chatbot/types";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupabaseClientInstance = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function getAdminOrFallback(fallback: SupabaseClientInstance) {
  try {
    return createSupabaseAdminClient();
  } catch {
    return fallback;
  }
}

const DEFAULT_SETTINGS = {
  id: true,
  botName: "Assistant Virtuel",
  botAvatarUrl: null,
  primaryColor: "#077BAD",
  modelName: "qwen/qwen-2.5-72b-instruct",
  welcomeMessage: "Bonjour !",
  offlineMessage: "Conseillers indisponibles.",
  suggestedQuestions: [] as string[],
  aiTone: "institutional" as const,
  financialDisclaimer: "",
  isAgentOnline: false,
  businessHoursStart: "08:00:00",
  businessHoursEnd: "17:30:00",
  businessDays: [1, 2, 3, 4, 5],
  updatedAt: "",
};

export async function fetchChatbotSettings(
  supabase: SupabaseClientInstance,
): Promise<ChatbotSettings> {
  const { data: row, error } = await supabase
    .from("chatbot_settings")
    .select("*")
    .eq("id", true)
    .single();

  if (error || !row) throw new Error("Configuration du chatbot introuvable.");

  return {
    ...DEFAULT_SETTINGS,
    botName: row.bot_name,
    botAvatarUrl: row.bot_avatar_url,
    primaryColor: row.primary_color,
    modelName: row.model_name,
    welcomeMessage: row.welcome_message,
    offlineMessage: row.offline_message,
    suggestedQuestions: Array.isArray(row.suggested_questions)
      ? (row.suggested_questions as string[])
      : [],
    aiTone: row.ai_tone as ChatbotSettings["aiTone"],
    financialDisclaimer: row.financial_disclaimer,
    isAgentOnline: row.is_agent_online,
    businessHoursStart: row.business_hours_start,
    businessHoursEnd: row.business_hours_end,
    businessDays: row.business_days,
    updatedAt: row.updated_at,
  };
}

export async function resolveClientContext(
  supabase: SupabaseClientInstance,
  userId?: string,
): Promise<ClientContext | undefined> {
  if (!userId) return undefined;
  const db = getAdminOrFallback(supabase);
  const { data: profile } = await db
    .from("profiles")
    .select("firstname, lastname, kyc_status")
    .eq("id", userId)
    .single();

  if (!profile) return undefined;
  return {
    firstname: profile.firstname,
    lastname: profile.lastname,
    kycStatus: profile.kyc_status,
  };
}

async function findExistingConversation(
  db: SupabaseClientInstance,
  convId: string,
  userId?: string,
  sessionId?: string,
): Promise<{ id: string; status: string } | null> {
  const { data: existing } = await db
    .from("support_conversations")
    .select("id, user_id, session_id, status")
    .eq("id", convId)
    .single();

  if (!existing) return null;
  const isOwner = userId ? existing.user_id === userId : existing.session_id === sessionId;
  if (!isOwner) return null;

  return { id: existing.id, status: existing.status };
}

export async function verifyOrInitConversation(params: {
  supabase: SupabaseClientInstance;
  conversationId: string | null;
  sessionId: string;
  userId?: string;
  cleanMessage: string;
  clientName?: string;
}): Promise<{ convId: string; status: string }> {
  const { supabase, sessionId, userId, cleanMessage, clientName } = params;
  const db = getAdminOrFallback(supabase);
  const effectiveClientName = userId ? clientName?.trim() || "Client" : "Visiteur";
  let convId = params.conversationId;
  let currentStatus = "bot";

  if (convId) {
    const existing = await findExistingConversation(db, convId, userId, sessionId);
    if (existing) {
      currentStatus = existing.status;
    } else {
      convId = null;
    }
  }

  if (!convId) {
    const { data: created, error } = await db
      .from("support_conversations")
      .insert({ user_id: userId || null, session_id: sessionId, status: "bot" })
      .select("id, status")
      .single();
    if (error || !created) throw new Error("Impossible de créer la conversation.");
    convId = created.id;
    currentStatus = created.status;
  }

  if (cleanMessage) {
    await db.from("support_messages").insert({
      conversation_id: convId,
      sender_type: "user",
      sender_name: effectiveClientName,
      content: cleanMessage,
    });
    await db
      .from("support_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", convId);
  }

  return { convId, status: currentStatus };
}

export async function handleForcedEscalation(
  supabase: SupabaseClientInstance,
  convId: string,
  settings: ChatbotSettings,
) {
  const db = getAdminOrFallback(supabase);
  const routing = evaluateHandOffRouting(settings);
  if (routing.mode === "live_chat") {
    await db
      .from("support_conversations")
      .update({ status: "waiting_agent", last_message_at: new Date().toISOString() })
      .eq("id", convId);

    await db.from("support_messages").insert({
      conversation_id: convId,
      sender_type: "system",
      content: routing.message,
    });

    return NextResponse.json({
      conversationId: convId,
      status: "waiting_agent",
      content: routing.message,
      routing,
    });
  }

  return NextResponse.json({
    conversationId: convId,
    status: "callback_ticket",
    content: routing.message,
    routing,
  });
}

export async function handleAiEscalation(
  supabase: SupabaseClientInstance,
  convId: string,
  aiResult: ChatCompletionResult,
  settings: ChatbotSettings,
) {
  const db = getAdminOrFallback(supabase);
  const routing = evaluateHandOffRouting(settings);
  const responseText = aiResult.content
    ? `${aiResult.content}\n\n${routing.message}`
    : routing.message;

  if (routing.mode === "live_chat") {
    await db
      .from("support_conversations")
      .update({ status: "waiting_agent", last_message_at: new Date().toISOString() })
      .eq("id", convId);
    await db
      .from("support_messages")
      .insert({ conversation_id: convId, sender_type: "bot", content: responseText });
    return NextResponse.json({
      conversationId: convId,
      status: "waiting_agent",
      content: responseText,
      routing,
    });
  }

  await db
    .from("support_messages")
    .insert({ conversation_id: convId, sender_type: "bot", content: responseText });
  return NextResponse.json({
    conversationId: convId,
    status: "callback_ticket",
    content: responseText,
    routing,
  });
}

export async function getRecentHistory(
  supabase: SupabaseClientInstance,
  convId: string,
): Promise<ChatMessage[]> {
  const db = getAdminOrFallback(supabase);
  const { data: msgRows } = await db
    .from("support_messages")
    .select("sender_type, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(8);

  return (msgRows || []).map((m) => ({
    role: m.sender_type === "user" ? "user" : "assistant",
    content: m.content,
  }));
}

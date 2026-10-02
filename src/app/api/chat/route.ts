import { NextResponse } from "next/server";

import {
  fetchChatbotSettings,
  getRecentHistory,
  handleAiEscalation,
  handleForcedEscalation,
  resolveClientContext,
  verifyOrInitConversation,
  type SupabaseClientInstance,
} from "@/lib/chatbot/chat-session-service";
import { verifySameOrigin } from "@/lib/chatbot/csrf";
import { executeChatCompletion } from "@/lib/chatbot/openrouter";
import {
  buildSystemPrompt,
  retrieveRelevantKnowledge,
  sanitizeUserInput,
  type ClientContext,
} from "@/lib/chatbot/rag-service";
import { checkRateLimit, getClientIp } from "@/lib/chatbot/rate-limiter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ChatbotSettings } from "@/lib/chatbot/types";

async function postAiResponseAtomically(
  supabase: SupabaseClientInstance,
  convId: string,
  botName: string,
  content: string,
) {
  const { data: postResult, error: postError } = await supabase.rpc(
    "post_support_message_and_transition",
    {
      p_conversation_id: convId,
      p_sender_type: "bot",
      p_sender_name: botName || "Assistant",
      p_content: content,
      p_target_status: null,
    },
  );

  if (!postError && postResult) {
    const parsed =
      typeof postResult === "string"
        ? JSON.parse(postResult)
        : (postResult as Record<string, unknown>);
    if (parsed.success === false && parsed.reason === "AGENT_ALREADY_ACTIVE") {
      return { inLiveChat: true, status: (parsed.current_status as string) || "agent_active" };
    }
    return { inLiveChat: false, status: (parsed.status as string) || "bot" };
  }

  const { data: currentConv } = await supabase
    .from("support_conversations")
    .select("status")
    .eq("id", convId)
    .single();

  if (
    currentConv &&
    (currentConv.status === "waiting_agent" || currentConv.status === "agent_active")
  ) {
    return { inLiveChat: true, status: currentConv.status };
  }

  await supabase.from("support_messages").insert({
    conversation_id: convId,
    sender_type: "bot",
    content,
  });
  await supabase
    .from("support_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", convId);

  return { inLiveChat: false, status: "bot" };
}

async function generateAiAnswer(params: {
  supabase: SupabaseClientInstance;
  convId: string;
  cleanMessage: string;
  settings: ChatbotSettings;
  clientContext?: ClientContext;
}) {
  const { supabase, convId, cleanMessage, settings, clientContext } = params;
  const adminClient = createSupabaseAdminClient();
  const matchedDocs = await retrieveRelevantKnowledge(adminClient, cleanMessage);
  console.warn(
    `[Chat API] Requête: "${cleanMessage.slice(0, 60)}" | Docs RAG trouvés: ${matchedDocs.length}`,
  );
  const history = await getRecentHistory(supabase, convId);
  const systemPrompt = buildSystemPrompt({ settings, matchedItems: matchedDocs, clientContext });
  const aiResult = await executeChatCompletion({
    messages: [{ role: "system", content: systemPrompt }, ...history],
    model: settings.modelName,
  });

  if (aiResult.toolCall?.name === "escalate_to_human") {
    return handleAiEscalation(supabase, convId, aiResult, settings);
  }

  const outcome = await postAiResponseAtomically(
    supabase,
    convId,
    settings.botName,
    aiResult.content,
  );
  if (outcome.inLiveChat) {
    return NextResponse.json({
      conversationId: convId,
      status: outcome.status,
      content: null,
      inLiveChat: true,
    });
  }

  return NextResponse.json({
    conversationId: convId,
    status: outcome.status,
    content: aiResult.content,
  });
}

function parseChatBody(body: Record<string, unknown>) {
  const rawMessage = typeof body.message === "string" ? body.message : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const forceEscalate = Boolean(body.forceEscalate);
  const convParam = typeof body.conversationId === "string" ? body.conversationId : null;

  if ((!rawMessage.trim() && !forceEscalate) || !sessionId) return null;
  return { rawMessage, sessionId, forceEscalate, convParam };
}

function checkChatRateLimit(req: Request): NextResponse | null {
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit({ key: `chat_${ip}`, limit: 15, windowMs: 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Trop de requêtes. Veuillez patienter ${rateCheck.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }
  return null;
}

function isLiveChatStatus(status: string): boolean {
  return status === "waiting_agent" || status === "agent_active";
}

function formatDetailedError(err: unknown): string {
  if (err instanceof Error) {
    const cause = err.cause ? `\nCause: ${JSON.stringify(err.cause)}` : "";
    return `${err.name}: ${err.message}${cause}${err.stack ? `\nStack trace: ${err.stack}` : ""}`;
  }
  if (typeof err === "object" && err !== null) {
    try {
      return JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

async function resolveAuthAndClientContext(supabase: SupabaseClientInstance) {
  const authResult = await supabase.auth.getUser();
  const userId = authResult.data?.user?.id;
  if (!userId) {
    return { userId: undefined, clientContext: undefined, clientName: "Visiteur" };
  }

  const clientContext = await resolveClientContext(supabase, userId);
  const realClientName = clientContext
    ? [clientContext.firstname, clientContext.lastname].filter(Boolean).join(" ").trim()
    : "";

  return {
    userId,
    clientContext,
    clientName: realClientName || "Client",
  };
}

export async function POST(req: Request) {
  try {
    if (!verifySameOrigin(req)) {
      return NextResponse.json({ error: "Requête non autorisée" }, { status: 403 });
    }

    const rateLimitError = checkChatRateLimit(req);
    if (rateLimitError) return rateLimitError;

    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseChatBody(body);
    if (!parsed) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const cleanMessage = sanitizeUserInput(parsed.rawMessage);
    const settings = await fetchChatbotSettings(supabase);
    const { userId, clientContext, clientName } = await resolveAuthAndClientContext(supabase);

    const { convId, status } = await verifyOrInitConversation({
      supabase,
      conversationId: parsed.convParam,
      sessionId: parsed.sessionId,
      userId,
      cleanMessage,
      clientName,
    });

    if (parsed.forceEscalate) return handleForcedEscalation(supabase, convId, settings);

    if (isLiveChatStatus(status)) {
      return NextResponse.json({
        conversationId: convId,
        status,
        content: null,
        inLiveChat: true,
      });
    }

    return await generateAiAnswer({ supabase, convId, cleanMessage, settings, clientContext });
  } catch (err: unknown) {
    console.error("[Chat API Error]", formatDetailedError(err));
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la communication." },
      { status: 500 },
    );
  }
}

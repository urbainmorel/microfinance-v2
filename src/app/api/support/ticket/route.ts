import { NextResponse } from "next/server";

import { verifySameOrigin } from "@/lib/chatbot/csrf";
import { checkRateLimit, getClientIp } from "@/lib/chatbot/rate-limiter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface TicketPayload {
  conversationId?: string | null;
  sessionId?: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  loanAmountRequested?: number | null;
  loanPurpose?: string | null;
  conversationSummary?: string | null;
}

function parseValidAmount(val: unknown): number | null {
  if (!val) return null;
  const num = Number(val);
  return !Number.isNaN(num) && num > 0 && num <= 500_000_000 ? num : null;
}

function parseTrimmedString(val: unknown, maxLen: number): string | null {
  return typeof val === "string" ? val.trim().slice(0, maxLen) : null;
}

function parseTicketPayload(body: Record<string, unknown>): TicketPayload | null {
  const clientName = parseTrimmedString(body.clientName, 100) || "";
  const clientPhone = parseTrimmedString(body.clientPhone, 25) || "";

  if (!clientName || clientPhone.length < 6) return null;

  return {
    conversationId: typeof body.conversationId === "string" ? body.conversationId : null,
    sessionId: parseTrimmedString(body.sessionId, 100),
    clientName,
    clientPhone,
    clientEmail: parseTrimmedString(body.clientEmail, 150),
    loanAmountRequested: parseValidAmount(body.loanAmountRequested),
    loanPurpose: parseTrimmedString(body.loanPurpose, 300),
    conversationSummary:
      parseTrimmedString(body.conversationSummary, 1000) ||
      "Demande de contact déposée via le chatbot.",
  };
}

/**
 * La RPC SECURITY DEFINER n'est exécutable que par le service_role (décision D24).
 * Comme elle contourne la RLS, l'appartenance de la conversation est vérifiée ici :
 * un visiteur anonyme doit fournir le sessionId de la conversation, un client
 * authentifié doit en être le propriétaire.
 */
async function resolveOwnedConversationId(params: {
  conversationId: string | null;
  sessionId: string | null;
}): Promise<string | null> {
  if (!params.conversationId) return null;

  const adminClient = createSupabaseAdminClient();
  const { data: conv } = await adminClient
    .from("support_conversations")
    .select("id, user_id, session_id")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!conv) return null;

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  const isOwner = userId
    ? conv.user_id === userId
    : Boolean(params.sessionId) && conv.session_id === params.sessionId;

  return isOwner ? conv.id : null;
}

async function saveTicket(
  payload: TicketPayload,
  conversationId: string | null,
): Promise<string | null> {
  const adminClient = createSupabaseAdminClient();
  const { data: ticketId, error: rpcErr } = await adminClient.rpc("create_support_ticket_atomic", {
    p_conversation_id: conversationId,
    p_client_name: payload.clientName,
    p_client_phone: payload.clientPhone,
    p_client_email: payload.clientEmail || null,
    p_loan_amount: payload.loanAmountRequested || null,
    p_loan_purpose: payload.loanPurpose || null,
    p_summary: payload.conversationSummary || null,
  });

  if (rpcErr || !ticketId) {
    console.error("Erreur RPC create_support_ticket_atomic:", rpcErr?.code, rpcErr?.message);
    return null;
  }
  return String(ticketId);
}

export async function POST(req: Request) {
  try {
    if (!verifySameOrigin(req)) {
      return NextResponse.json({ error: "Requête non autorisée" }, { status: 403 });
    }

    const ip = getClientIp(req);
    const rateCheck = checkRateLimit({ key: `ticket_${ip}`, limit: 5, windowMs: 10 * 60 * 1000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Limite de demandes atteinte. Réessayez dans ${rateCheck.retryAfterSeconds}s.` },
        { status: 429 },
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const payload = parseTicketPayload(body);
    if (!payload) {
      return NextResponse.json(
        { error: "Le nom et un numéro de téléphone valide sont obligatoires." },
        { status: 400 },
      );
    }

    const conversationId = await resolveOwnedConversationId({
      conversationId: payload.conversationId || null,
      sessionId: payload.sessionId || null,
    });
    const ticketId = await saveTicket(payload, conversationId);
    if (!ticketId) {
      return NextResponse.json(
        { error: "Impossible d'enregistrer votre demande pour le moment." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      ticketId,
      message: "Demande de rappel enregistrée avec succès.",
    });
  } catch (err: unknown) {
    console.error("Erreur ticket API:", err instanceof Error ? err.name : "InternalError");
    return NextResponse.json(
      { error: "Impossible d'enregistrer votre demande pour le moment." },
      { status: 500 },
    );
  }
}

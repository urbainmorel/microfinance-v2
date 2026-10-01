import { NextResponse } from "next/server";

import { verifySameOrigin } from "@/lib/chatbot/csrf";
import { checkRateLimit, getClientIp } from "@/lib/chatbot/rate-limiter";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface TicketPayload {
  conversationId?: string | null;
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

async function saveTicket(payload: TicketPayload): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: ticketId, error: rpcErr } = await supabase.rpc("create_support_ticket_atomic", {
    p_conversation_id: payload.conversationId || null,
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

    const ticketId = await saveTicket(payload);
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

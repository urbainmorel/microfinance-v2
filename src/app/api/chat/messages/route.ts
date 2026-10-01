import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const sessionId = searchParams.get("sessionId");

    if (!conversationId) {
      return NextResponse.json({ messages: [], status: "bot" });
    }

    const supabase = await createSupabaseServerClient();
    const { data: conv } = await supabase
      .from("support_conversations")
      .select("id, status, session_id, user_id")
      .eq("id", conversationId)
      .single();

    if (!conv) {
      return NextResponse.json({ messages: [], status: "bot" });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !sessionId) {
      return NextResponse.json({ error: "Identifiant de session requis" }, { status: 401 });
    }

    const isOwner = user
      ? conv.user_id === user.id
      : Boolean(sessionId) && conv.session_id === sessionId;

    if (!isOwner) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { data: messages, error } = await supabase
      .from("support_messages")
      .select("id, sender_type, sender_name, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      status: conv.status,
      messages: (messages || []).map((m) => ({
        id: m.id,
        senderType: m.sender_type,
        senderName: m.sender_name,
        content: m.content,
        createdAt: m.created_at,
      })),
    });
  } catch (err: unknown) {
    console.error("Erreur messages API:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Impossible de récupérer les messages." }, { status: 500 });
  }
}

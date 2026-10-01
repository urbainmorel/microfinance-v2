import { NextResponse } from "next/server";

import { verifySameOrigin } from "@/lib/chatbot/csrf";
import { createEmbedding } from "@/lib/chatbot/openrouter";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAdminClient() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errorResponse: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { errorResponse: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }

  return { supabase };
}

interface KnowledgePayload {
  id?: string;
  title: string;
  category?: string;
  content: string;
  isActive?: boolean;
}

async function persistKnowledge(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  payload: KnowledgePayload,
) {
  const { id, title, category = "Général", content, isActive = true } = payload;
  const embeddingText = `${title}\n${category}\n${content}`;
  const embedding = (await createEmbedding(embeddingText)) as unknown as string;

  if (id) {
    const { error } = await supabase
      .from("knowledge_items")
      .update({
        title,
        category,
        content,
        embedding,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("knowledge_items").insert({
    title,
    category,
    content,
    embedding,
    is_active: isActive,
  });
  if (error) throw error;
}

export async function POST(req: Request) {
  try {
    if (!verifySameOrigin(req)) {
      return NextResponse.json({ error: "Requête non autorisée" }, { status: 403 });
    }

    const { supabase, errorResponse } = await getAdminClient();
    if (errorResponse || !supabase) return errorResponse;

    const body = (await req.json()) as KnowledgePayload;
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Le titre et le contenu sont obligatoires." },
        { status: 400 },
      );
    }

    await persistKnowledge(supabase, body);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!verifySameOrigin(req)) {
      return NextResponse.json({ error: "Requête non autorisée" }, { status: 403 });
    }

    const { supabase, errorResponse } = await getAdminClient();
    if (errorResponse || !supabase) return errorResponse;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const { error } = await supabase.from("knowledge_items").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

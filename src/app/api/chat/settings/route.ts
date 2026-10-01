import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: row, error } = await supabase
      .from("chatbot_settings")
      .select(
        "bot_name, bot_avatar_url, primary_color, welcome_message, offline_message, suggested_questions, is_agent_online, financial_disclaimer",
      )
      .eq("id", true)
      .single();

    if (error || !row) {
      return NextResponse.json({
        botName: "Assistant Azari",
        botAvatarUrl: null,
        primaryColor: "#077BAD",
        welcomeMessage:
          "Bonjour ! Comment puis-je vous renseigner sur nos offres de crédit et d'épargne ?",
        offlineMessage:
          "Nos conseillers sont actuellement indisponibles. Laissez-nous vos coordonnées, nous vous recontacterons dès l'ouverture.",
        suggestedQuestions: [
          "Comment obtenir un micro-prêt ?",
          "Quels sont vos taux d'épargne ?",
          "Quelles pièces fournir pour le KYC ?",
        ],
        isAgentOnline: false,
        financialDisclaimer:
          "Les simulations et explications fournies par l'assistant sont informatives et ne constituent pas une offre contractuelle de prêt.",
      });
    }

    return NextResponse.json({
      botName: row.bot_name,
      botAvatarUrl: row.bot_avatar_url,
      primaryColor: row.primary_color,
      welcomeMessage: row.welcome_message,
      offlineMessage: row.offline_message,
      suggestedQuestions: Array.isArray(row.suggested_questions) ? row.suggested_questions : [],
      isAgentOnline: Boolean(row.is_agent_online),
      financialDisclaimer: row.financial_disclaimer,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

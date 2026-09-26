import { NextResponse } from "next/server";

import {
  applyAiDecisionAndPersist,
  buildAiPayload,
  requestOpenRouter,
} from "@/lib/kyc/ai-verification-service";
import { prepareDocuments } from "@/lib/kyc/document-resolver";
import { checkAndRecordVerificationCooldown } from "@/lib/kyc/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser() {
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!checkAndRecordVerificationCooldown(user.id)) {
      return NextResponse.json(
        { error: "Veuillez patienter 30 secondes avant de relancer une vérification." },
        { status: 429 },
      );
    }

    const adminClient = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, firstname, lastname, country, id_type, kyc_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    if (profile.kyc_status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        status: "COMPLETED",
        message: "Dossier KYC déjà validé.",
      });
    }

    const docsResult = await prepareDocuments(adminClient, user.id, profile.id_type);
    if (!docsResult.success) {
      return NextResponse.json(docsResult.responsePayload, { status: docsResult.statusCode });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Configuration OpenRouter manquante (OPENROUTER_API_KEY)" },
        { status: 500 },
      );
    }

    const { systemPrompt, content } = buildAiPayload(profile, docsResult.urls);
    const rawAiText = await requestOpenRouter(systemPrompt, content, apiKey);

    if (rawAiText === null) {
      return NextResponse.json(
        { error: "Le service d'analyse d'identité est momentanément indisponible." },
        { status: 502 },
      );
    }

    const persistResult = await applyAiDecisionAndPersist(adminClient, user.id, rawAiText);
    if (!persistResult.success) {
      return NextResponse.json(
        { error: persistResult.error },
        { status: persistResult.statusCode },
      );
    }

    return NextResponse.json(persistResult.data);
  } catch (error) {
    console.error("Exception auto-verify:", error);
    return NextResponse.json(
      {
        error: "Une erreur inattendue est survenue lors de la vérification.",
      },
      { status: 500 },
    );
  }
}

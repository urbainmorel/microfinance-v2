import { NextResponse } from "next/server";

import { getKycAiSystemPrompt, parseAiDecision } from "@/lib/kyc-ai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { Json } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type ProfileData = {
  id: string;
  firstname: string;
  lastname: string;
  country: string | null;
  id_type: string | null;
  kyc_status: string | null;
};

type SignedDocUrls = {
  frontUrl: string;
  backUrl: string | null;
};

type KycDocRow = { id: string; doc_type: string; url: string | null };

async function getAuthenticatedUser() {
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

function findRequiredDocs(documents: KycDocRow[], requiresBack: boolean) {
  const front = documents.find((d) => d.doc_type === "ID_FRONT");
  const back = documents.find((d) => d.doc_type === "ID_BACK");

  if (!front || (requiresBack && !back)) {
    return null;
  }
  return { front, back };
}

async function getSignedUrl(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const res = await adminClient.storage.from("kyc-documents").createSignedUrl(path, 120);
  return res.data ? res.data.signedUrl : null;
}

async function resolveSignedUrls(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  frontPath: string,
  backPath: string | null,
): Promise<SignedDocUrls | null> {
  const [frontUrl, backUrl] = await Promise.all([
    getSignedUrl(adminClient, frontPath),
    getSignedUrl(adminClient, backPath),
  ]);

  if (!frontUrl) return null;
  if (backPath && !backUrl) return null;

  return { frontUrl, backUrl };
}

async function prepareDocuments(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  idType: string | null,
): Promise<{ urls?: SignedDocUrls; errorResponse?: NextResponse }> {
  const { data: documents, error } = await adminClient
    .from("kyc_documents")
    .select("id, doc_type, url")
    .eq("client_id", userId);

  if (error || !documents) {
    return {
      errorResponse: NextResponse.json(
        { error: "Impossible de récupérer les pièces du dossier" },
        { status: 500 },
      ),
    };
  }

  const requiresBack = idType !== "PASSPORT";
  const docs = findRequiredDocs(documents, requiresBack);
  if (!docs) {
    const reason = "Dossier incomplet : le recto et le verso (si requis) doivent être fournis.";
    await adminClient.rpc("auto_process_kyc", {
      p_client_id: userId,
      p_decision: "REJECT",
      p_reason: reason,
      p_report: { missing_docs: true } as unknown as Json,
    });
    return {
      errorResponse: NextResponse.json({ success: false, status: "REJECTED", reason }),
    };
  }

  const urls = await resolveSignedUrls(
    adminClient,
    docs.front.url || `${userId}/ID_FRONT`,
    requiresBack ? docs.back?.url || `${userId}/ID_BACK` : null,
  );

  if (!urls) {
    return {
      errorResponse: NextResponse.json(
        { error: "Erreur lors de la préparation sécurisée des justificatifs" },
        { status: 500 },
      ),
    };
  }

  return { urls };
}

function buildAiPayload(profile: ProfileData, urls: SignedDocUrls) {
  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = getKycAiSystemPrompt(today);

  const content: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text: `Informations déclarées par le client :
- Nom : ${profile.lastname}
- Prénom(s) : ${profile.firstname}
- Type de pièce : ${profile.id_type}
- Pays : ${profile.country}

Note importante : Le client n'a pas eu à saisir sa date de naissance ni son numéro de pièce. Tu dois impérativement extraire sa date de naissance (format YYYY-MM-DD) et son numéro de pièce officiel depuis le document, et les inclure dans "extracted_data".

Justificatifs joints dans l'ordre :
1. Pièce d'identité — Recto (ID_FRONT)
${urls.backUrl ? "2. Pièce d'identité — Verso (ID_BACK)" : ""}

Analyse ces images et retourne le diagnostic en JSON strict.`,
    },
    { type: "image_url", image_url: { url: urls.frontUrl } },
  ];

  if (urls.backUrl) {
    content.push({ type: "image_url", image_url: { url: urls.backUrl } });
  }

  return { systemPrompt, content };
}

async function requestOpenRouter(systemPrompt: string, content: unknown[], apiKey: string) {
  const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "https://azari-microfinance.local",
      "X-Title": "Azari Microfinance KYC AI",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
    }),
  });

  if (!openRouterRes.ok) {
    const errText = await openRouterRes.text();
    console.error("OpenRouter API error:", errText);
    return null;
  }

  const aiJson = await openRouterRes.json();
  return aiJson.choices?.[0]?.message?.content as string | undefined;
}

async function applyAiDecisionAndRespond(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  rawAiText: string | undefined,
) {
  const { decision, reason, report } = parseAiDecision(rawAiText);

  const { error: rpcError } = await adminClient.rpc("auto_process_kyc", {
    p_client_id: userId,
    p_decision: decision,
    p_reason: reason,
    p_report: report as unknown as Json,
  });

  if (rpcError) {
    console.error("Erreur auto_process_kyc:", rpcError);
    return NextResponse.json(
      { error: `Erreur lors de l'enregistrement de la décision : ${rpcError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    status: decision === "VALIDATE" ? "COMPLETED" : "REJECTED",
    reason,
    report,
  });
}

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
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
    if (docsResult.errorResponse) return docsResult.errorResponse;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Configuration OpenRouter manquante (OPENROUTER_API_KEY)" },
        { status: 500 },
      );
    }

    const { systemPrompt, content } = buildAiPayload(profile, docsResult.urls!);
    const rawAiText = await requestOpenRouter(systemPrompt, content, apiKey);

    if (rawAiText === null) {
      return NextResponse.json(
        { error: "Le service d'analyse d'identité est momentanément indisponible." },
        { status: 502 },
      );
    }

    return await applyAiDecisionAndRespond(adminClient, user.id, rawAiText);
  } catch (error) {
    console.error("Exception auto-verify:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue lors de la vérification.",
      },
      { status: 500 },
    );
  }
}

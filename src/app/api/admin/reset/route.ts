import { NextResponse } from "next/server";

import {
  purgeAllStorageFiles,
  purgeClientAccounts,
  purgeSupportAndKnowledge,
  purgeTransactionalData,
  recordResetAudit,
  updateBrandSettings,
} from "@/lib/admin/app-reset-service";
import { verifySameOrigin } from "@/lib/chatbot/csrf";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface ResetRequestBody {
  newBrandName?: string;
  depositPhone?: string;
  depositOperator?: string;
  depositInstruction?: string;
  confirmationKeyword?: string;
}

async function verifyAdminAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errorResponse: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      errorResponse: NextResponse.json(
        { error: "Accès réservé aux administrateurs" },
        { status: 403 },
      ),
    };
  }

  return { supabase, user };
}

function validateResetPayload(body: ResetRequestBody) {
  const newBrandName = body.newBrandName?.trim() ?? "";
  if (!newBrandName || newBrandName.length < 2) {
    return {
      valid: false,
      error: "Le nom de la nouvelle marque est requis (au moins 2 caractères).",
    };
  }

  if (body.confirmationKeyword?.trim() !== "REINITIALISER") {
    return {
      valid: false,
      error: 'Veuillez saisir exactement le mot "REINITIALISER" pour confirmer cette opération.',
    };
  }

  return { valid: true, newBrandName };
}

export async function POST(request: Request) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json(
      { error: "Origine de la requête non autorisée (protection CSRF)" },
      { status: 403 },
    );
  }

  const auth = await verifyAdminAuth();
  if (auth.errorResponse) return auth.errorResponse;

  let body: ResetRequestBody;
  try {
    body = (await request.json()) as ResetRequestBody;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const validation = validateResetPayload(body);
  if (!validation.valid || !validation.newBrandName) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const adminClient = createSupabaseAdminClient();

    const { data: currentSettings } = await adminClient
      .from("app_settings")
      .select("platform_name")
      .eq("id", true)
      .single();

    const previousBrandName = currentSettings?.platform_name || "Azari Microfinance";

    await purgeSupportAndKnowledge(adminClient);
    await purgeTransactionalData(adminClient);
    const purgedClients = await purgeClientAccounts(adminClient, auth.user.id);
    const purgedFiles = await purgeAllStorageFiles(adminClient);

    await updateBrandSettings(adminClient, {
      newBrandName: validation.newBrandName,
      depositPhone: body.depositPhone,
      depositOperator: body.depositOperator,
      depositInstruction: body.depositInstruction,
    });

    await recordResetAudit(adminClient, auth.user.id, {
      previousBrandName,
      newBrandName: validation.newBrandName,
      purgedClients,
      purgedFiles,
    });

    return NextResponse.json({
      success: true,
      message: `L'application a été réinitialisée avec succès sous la marque "${validation.newBrandName}".`,
      purgedClients,
      purgedFiles,
      newBrandName: validation.newBrandName,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la réinitialisation.";
    console.error("[Admin App Reset Error]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

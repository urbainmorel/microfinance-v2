import { listAllStorageFiles, purgeBucketBatches } from "@/lib/admin/storage-crawler";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface BrandUpdatePayload {
  newBrandName: string;
  depositPhone?: string;
  depositOperator?: string;
  depositInstruction?: string;
}

export async function purgeSupportAndKnowledge(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
) {
  const dummyUuid = "00000000-0000-0000-0000-000000000000";
  await adminClient.from("support_messages").delete().neq("id", dummyUuid);
  await adminClient.from("support_tickets").delete().neq("id", dummyUuid);
  await adminClient.from("support_conversations").delete().neq("id", dummyUuid);
  await adminClient.from("knowledge_items").delete().neq("id", dummyUuid);
}

export async function purgeTransactionalData(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
) {
  const dummyUuid = "00000000-0000-0000-0000-000000000000";
  await adminClient.from("amortization_schedules").delete().neq("id", dummyUuid);
  await adminClient.from("loan_contracts").delete().neq("id", dummyUuid);
  await adminClient.from("loan_request_documents").delete().neq("id", dummyUuid);
  await adminClient.from("repayment_requests").delete().neq("id", dummyUuid);
  await adminClient.from("deposit_requests").delete().neq("id", dummyUuid);
  await adminClient.from("withdrawal_requests").delete().neq("id", dummyUuid);
  await adminClient.from("loans").delete().neq("id", dummyUuid);
  await adminClient.from("loan_requests").delete().neq("id", dummyUuid);
  await adminClient.from("notifications").delete().neq("id", dummyUuid);
  await adminClient.from("notification_outbox").delete().neq("id", dummyUuid);
  await adminClient.from("pin_reset_challenges").delete().neq("id", dummyUuid);
  await adminClient.from("user_consents").delete().neq("id", dummyUuid);
  await adminClient.from("data_erasure_requests").delete().neq("id", dummyUuid);
  await adminClient.from("kyc_documents").delete().neq("id", dummyUuid);
  await adminClient.from("kyc_financials").delete().neq("client_id", dummyUuid);
  await adminClient.from("wallets").delete().neq("client_id", dummyUuid);
}

export async function purgeClientAccounts(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  preserveAdminId: string,
) {
  const { data: clients } = await adminClient
    .from("profiles")
    .select("id")
    .neq("id", preserveAdminId)
    .neq("role", "admin");

  const clientIds = (clients ?? []).map((c) => c.id);

  if (clientIds.length > 0) {
    await Promise.all(
      clientIds.map((id) => adminClient.auth.admin.deleteUser(id).catch(() => null)),
    );
    await adminClient.from("profiles").delete().neq("id", preserveAdminId).neq("role", "admin");
  }

  return clientIds.length;
}

export async function purgeAllStorageFiles(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
) {
  const allFiles = await listAllStorageFiles(adminClient);
  if (allFiles.length > 0) {
    await purgeBucketBatches(adminClient, allFiles);
  }
  return allFiles.length;
}

export async function updateBrandSettings(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  payload: BrandUpdatePayload,
) {
  const name = payload.newBrandName.trim();
  const now = new Date().toISOString();

  await adminClient
    .from("app_settings")
    .update({
      platform_name: name,
      deposit_phone: payload.depositPhone?.trim() || null,
      deposit_operator: payload.depositOperator?.trim() || null,
      deposit_instruction: payload.depositInstruction?.trim() || null,
      updated_at: now,
    })
    .eq("id", true);

  await adminClient
    .from("chatbot_settings")
    .update({
      bot_name: `Assistant ${name}`,
      welcome_message: `Bonjour ! Bienvenue sur l'espace d'assistance de ${name}. En quoi puis-je vous renseigner aujourd'hui ?`,
      financial_disclaimer: `Les simulations fournies par l'assistant ${name} sont purement indicatives et ne constituent pas un engagement contractuel.`,
      updated_at: now,
    })
    .eq("id", true);
}

export async function recordResetAudit(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  adminId: string,
  details: {
    previousBrandName: string;
    newBrandName: string;
    purgedClients: number;
    purgedFiles: number;
  },
) {
  await adminClient.from("audit_logs").insert({
    user_id: adminId,
    user_role: "admin",
    action_type: "APP_REBRAND_RESET",
    reason: `Remise à zéro complète et changement de marque de [${details.previousBrandName}] vers [${details.newBrandName}]`,
    old_value: { brand: details.previousBrandName },
    new_value: {
      brand: details.newBrandName,
      purgedClients: details.purgedClients,
      purgedFiles: details.purgedFiles,
      executedAt: new Date().toISOString(),
    },
  });
}

import type { KycField, KycInput } from "@/lib/schemas/kyc";
import type { SupabaseClient } from "@supabase/supabase-js";

function pick(values: KycInput, fields: readonly KycField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f];
    if (v !== undefined && v !== "" && v !== null) out[f] = v;
  }
  return out;
}

/** Enregistre une étape via la RPC serveur adéquate (PRD §6.4, sauvegarde auto). */
export async function saveKycStep(
  supabase: SupabaseClient,
  target: "profile" | "financials" | "none",
  fields: readonly KycField[],
  values: KycInput,
): Promise<void> {
  const p_data = pick(values, fields);
  if (target === "profile") {
    const { error } = await supabase.rpc("save_kyc_profile", { p_data });
    if (error) throw error;
  } else if (target === "financials") {
    const { error } = await supabase.rpc("save_kyc_financials", { p_data });
    if (error) throw error;
  }
}

/** Recharge les données KYC existantes pour reprendre le wizard (PRD §6.4). */
export async function loadKyc(supabase: SupabaseClient): Promise<Partial<KycInput>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "birth_date, country, city, address, phone, profession, monthly_income_estimate, id_type, id_number, id_expiry",
    )
    .eq("id", user.id)
    .single();
  const { data: financials } = await supabase
    .from("kyc_financials")
    .select("income_source, monthly_charges, momo_operator, momo_number, usual_bank")
    .eq("client_id", user.id)
    .maybeSingle();
  return { ...(profile ?? {}), ...(financials ?? {}) } as Partial<KycInput>;
}

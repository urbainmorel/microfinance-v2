import { adminSupabase, asRecord, callRpc, numberValue } from "./api-client";

export type AppSettings = {
  auditRetentionDays: number;
  autoLoanApproval: boolean;
  defaultAfterDays: number;
  depositInstruction: string;
  depositOperator: string;
  depositPhone: string;
  kycRetentionDays: number;
  platformName: string;
  transferFee: number;
  withdrawalFee: number;
  withdrawalWindowEnd: number;
  withdrawalWindowStart: number;
};

export async function getAppSettings(): Promise<AppSettings> {
  const { data, error } = await adminSupabase
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) throw new Error(error.message);
  const row = asRecord(data);
  return {
    auditRetentionDays: numberValue(row.audit_retention_days),
    autoLoanApproval: Boolean(row.auto_loan_approval),
    defaultAfterDays: numberValue(row.default_after_days),
    depositInstruction:
      typeof row.deposit_instruction === "string" && row.deposit_instruction.trim()
        ? row.deposit_instruction.trim()
        : "Effectuez votre transfert Mobile Money vers ce numéro, puis renseignez la référence de transaction et joignez la capture d'écran ci-dessous.",
    depositOperator:
      typeof row.deposit_operator === "string" && row.deposit_operator.trim()
        ? row.deposit_operator.trim()
        : "",
    depositPhone:
      typeof row.deposit_phone === "string" && row.deposit_phone.trim()
        ? row.deposit_phone.trim()
        : "",
    kycRetentionDays: numberValue(row.kyc_retention_days),
    platformName:
      typeof row.platform_name === "string" && row.platform_name.trim()
        ? row.platform_name.trim()
        : "Azari Microfinance",
    transferFee: numberValue(row.transfer_fee),
    withdrawalFee: numberValue(row.withdrawal_fee),
    withdrawalWindowEnd: numberValue(row.withdrawal_window_end),
    withdrawalWindowStart: numberValue(row.withdrawal_window_start),
  };
}

export async function saveAppSettings(values: AppSettings) {
  await callRpc("update_app_settings", { p_values: values });
}

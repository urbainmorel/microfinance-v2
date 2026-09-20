import { adminSupabase, asRecord, callRpc, numberValue } from "./api-client";

export type AppSettings = {
  auditRetentionDays: number;
  autoLoanApproval: boolean;
  defaultAfterDays: number;
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

import { adminSupabase, asRecord, numberValue, type DbRecord } from "./api-client";

import type { AdminKpis } from "./types";

function metric(record: DbRecord, key: string): number {
  return numberValue(record[key]);
}

export async function getAdminKpis(): Promise<AdminKpis> {
  const { data, error } = await adminSupabase.rpc("get_admin_kpis");
  if (error) throw new Error(error.message);
  const value = asRecord(data);
  return {
    totalClients: metric(value, "clients"),
    pendingKyc: metric(value, "kycPending"),
    completedKyc: metric(value, "kycCompleted"),
    pendingLoanRequests: metric(value, "loanRequestsPending"),
    pendingDeposits: metric(value, "pendingDeposits"),
    pendingWithdrawals: metric(value, "pendingWithdrawals"),
    pendingRepayments: metric(value, "pendingRepayments"),
    activeLoans: metric(value, "activeLoans"),
    overdueLoans: metric(value, "lateLoans"),
    totalDisbursed: metric(value, "totalDisbursed"),
    totalRepaid: metric(value, "totalRepaid"),
  };
}

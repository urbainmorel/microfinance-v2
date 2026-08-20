import { adminSupabase } from "./api-client";

import type { FinancialReport } from "./financial-report";

export type { FinancialReport } from "./financial-report";

export async function getFinancialReport(from: string, to: string): Promise<FinancialReport> {
  const { data, error } = await adminSupabase.rpc("get_admin_financial_report", {
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(error.message);
  return data as FinancialReport;
}

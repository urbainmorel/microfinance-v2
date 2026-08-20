import type { AppRole } from "@/lib/access-control";

export type StaffRole = Extract<AppRole, "admin">;

export type AccountRole = AppRole;

export interface AdminUserItem extends ClientSummary {
  role: AccountRole;
  isActive: boolean;
  kycStatus: string;
  createdAt: string;
}

export interface DataErasureRequestItem {
  id: string;
  userId: string;
  requester: ClientSummary | null;
  reason: string | null;
  status: string;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type AdminPermission = "kyc" | "cash" | "loans" | "products";

export interface ClientSummary {
  id: string;
  firstname: string;
  lastname: string;
  phone: string | null;
}

export interface AdminKpis {
  totalClients: number;
  pendingKyc: number;
  completedKyc: number;
  pendingLoanRequests: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingRepayments: number;
  activeLoans: number;
  overdueLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
}

export interface KycQueueItem extends ClientSummary {
  kycStatus: string;
  idType: string | null;
  idNumber: string | null;
  country: string | null;
  city: string | null;
  profession: string | null;
  monthlyIncomeEstimate: number | null;
  createdAt: string;
  documents: Array<{ type: string; url: string }>;
}

export interface DepositQueueItem {
  id: string;
  clientId: string;
  client: ClientSummary | null;
  amount: number;
  motif: string;
  paymentMethod: string;
  reference: string | null;
  proofUrl: string | null;
  status: string;
  createdAt: string;
}

export interface WithdrawalQueueItem {
  id: string;
  clientId: string;
  client: ClientSummary | null;
  type: string;
  amount: number;
  recipientName: string;
  recipientDetail: string;
  status: string;
  externalReference: string | null;
  createdAt: string;
}

export interface RepaymentQueueItem {
  id: string;
  loanId: string;
  clientId: string;
  client: ClientSummary | null;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  proofUrl: string | null;
  status: string;
  createdAt: string;
}

export interface LoanQueueItem {
  id: string;
  clientId: string;
  client: ClientSummary | null;
  productName: string;
  amount: number;
  durationMonths: number;
  purpose: string | null;
  status: string;
  approvedAmount: number | null;
  requestedDisbursementMethod: string | null;
  createdAt: string;
}

export interface LoanProduct {
  id: string;
  name: string;
  description: string | null;
  minAmount: number;
  maxAmount: number;
  minDurationMonths: number;
  maxDurationMonths: number;
  interestRate: number;
  interestMethod: "CONSTANT_INSTALLMENT" | "DEGRESSIVE";
  processingFeePercent: number;
  processingFeeFlat: number;
  managementFeePercent: number;
  managementFeeFlat: number;
  insuranceRate: number;
  guaranteeRate: number;
  mandatorySavingsRate: number;
  latePenaltyRate: number;
  isActive: boolean;
  createdAt: string;
}

export type LoanProductInput = Omit<LoanProduct, "id" | "createdAt">;

export interface AuditItem {
  id: string;
  actor: ClientSummary | null;
  userRole: string;
  actionType: string;
  targetId: string | null;
  reason: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

export type ScheduleRow = {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  fees: number;
  loanInstallment?: number;
  mandatorySavings: number;
  total: number;
};

export type LoanSimulation = {
  productId?: string;
  productName?: string;
  amount?: number;
  durationMonths?: number;
  interestRate?: number;
  interestMethod?: string;
  totalFees: number;
  guaranteeRequired: number;
  mandatorySavingsTotal: number;
  totalInterest: number;
  totalDue: number;
  recoverableAmount: number;
  loanTotalRepaid?: number;
  monthlyPayment?: number;
  monthlyTotal?: number;
  schedule: ScheduleRow[];
};

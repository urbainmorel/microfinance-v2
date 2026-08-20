export type ScheduleRow = {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  fees: number;
  mandatorySavings: number;
  total: number;
};

export type LoanSimulation = {
  totalFees: number;
  guaranteeRequired: number;
  mandatorySavingsTotal: number;
  totalInterest: number;
  totalDue: number;
  recoverableAmount: number;
  schedule: ScheduleRow[];
};

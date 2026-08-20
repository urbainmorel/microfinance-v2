export { getAdminKpis } from "./api-dashboard";
export { getAuditQueue, getKycQueue } from "./api-compliance";
export { getDepositQueue, getRepaymentQueue, getWithdrawalQueue } from "./api-finance";
export { getLoanProducts, getLoanQueue } from "./api-loans";
export { createLoanProduct, deactivateLoanProduct, updateLoanProduct } from "./api-products";
export {
  confirmDeposit,
  confirmRepayment,
  disburseLoan,
  manageUserStatus,
  processDataErasure,
  reviewKyc,
  settleWithdrawal,
  transitionLoanRequest,
} from "./api-rpc";
export {
  getAdminUsers,
  getCurrentStaffRole,
  getCurrentUserId,
  getDataErasureRequests,
} from "./api-users";

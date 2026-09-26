/** Routes de l'application — SOURCE UNIQUE pour la logique métier (proxy, auth-flow). */
export const ROUTES = {
  AUTH: {
    LOGIN: "/auth/login",
    VERIFY_EMAIL: "/auth/verify-email",
    SET_PIN: "/auth/set-pin",
  },
  CLIENT: {
    DASHBOARD: "/client/dashboard",
    KYC: "/client/kyc",
    DEPOSIT: "/client/deposit",
    WITHDRAW: "/client/withdraw",
    REPAY: "/client/repay",
    LOAN_REQUEST: "/client/loans/request",
  },
  ADMIN: {
    HOME: "/admin",
  },
} as const;

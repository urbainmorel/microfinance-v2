export type FinancialReport = {
  from: string;
  to: string;
  summary: {
    activeLoans: number;
    completedWithdrawals: number;
    confirmedDeposits: number;
    confirmedRepayments: number;
    defaultedLoans: number;
    disbursedLoans: number;
    outstandingPrincipal: number;
  };
  countries: Array<{ clients: number; country: string; deposits: number; withdrawals: number }>;
};

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function reportToCsv(report: FinancialReport) {
  const rows: Array<Array<string | number>> = [
    ["Période", `${report.from} — ${report.to}`],
    ["Dépôts confirmés XOF", report.summary.confirmedDeposits],
    ["Retraits exécutés XOF", report.summary.completedWithdrawals],
    ["Remboursements confirmés XOF", report.summary.confirmedRepayments],
    ["Prêts décaissés XOF", report.summary.disbursedLoans],
    ["Capital restant XOF", report.summary.outstandingPrincipal],
    ["Prêts actifs", report.summary.activeLoans],
    ["Prêts en défaut", report.summary.defaultedLoans],
    [],
    ["Pays", "Clients", "Dépôts XOF", "Retraits XOF"],
    ...report.countries.map((country) => [
      country.country,
      country.clients,
      country.deposits,
      country.withdrawals,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

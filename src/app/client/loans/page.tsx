import { LoanCard } from "@/components/dashboard/loan-card";

export default function LoansPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-foreground">Mes prêts</h1>
      <LoanCard />
    </div>
  );
}

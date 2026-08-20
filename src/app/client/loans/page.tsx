import { LoanCard } from "@/components/dashboard/loan-card";
import { LoanProducts } from "@/components/loans/loan-products";

export default function LoansPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-foreground">Mes prêts</h1>
      <LoanCard />
      <div className="mt-2">
        <h2 className="font-display text-xl font-bold text-foreground">Offres disponibles</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Choisissez une offre pour simuler son échéancier avant de faire votre demande.
        </p>
        <LoanProducts />
      </div>
    </div>
  );
}

import { LoanCard } from "@/components/dashboard/loan-card";
import { LoanProducts } from "@/components/loans/loan-products";
import { PageHeader } from "@/components/ui/page-header";

export default function LoansPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mon prêt"
        description="Suivez l’état de votre financement, votre garantie et vos échéances."
      />
      <LoanCard />
      <section>
        <h2 className="mb-4 font-display text-xl font-bold tracking-[-0.025em]">
          Offres disponibles
        </h2>
        <LoanProducts />
      </section>
    </div>
  );
}

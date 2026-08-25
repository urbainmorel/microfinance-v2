import { CalendarRange } from "lucide-react";

import { formatFcfa } from "@/lib/format";

import type { LoanProduct } from "@/lib/schemas/loan";

export function FinancingOfferMetrics({ product }: { product: LoanProduct }) {
  return (
    <dl className="divide-current/20 border-current/20 mt-5 grid grid-cols-3 divide-x border-t pt-4">
      <div>
        <dt className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-55">Montant</dt>
        <dd className="mt-1 text-xs font-bold leading-5 sm:text-sm">
          Jusqu’à {formatFcfa(product.max_amount)}
        </dd>
      </div>
      <div className="pl-4 sm:pl-6">
        <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] opacity-55">
          <CalendarRange className="size-3" aria-hidden /> Durée
        </dt>
        <dd className="mt-1 text-xs font-bold leading-5 sm:text-sm">
          Jusqu’à {product.max_duration_months} mois
        </dd>
      </div>
      <div className="pl-4 sm:pl-6">
        <dt className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-55">
          Taux / mois
        </dt>
        <dd className="mt-1 text-xs font-bold leading-5 sm:text-sm">
          {Number(product.interest_rate).toLocaleString("fr-FR")} %
        </dd>
      </div>
    </dl>
  );
}

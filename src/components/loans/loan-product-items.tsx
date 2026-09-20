import { CheckCircle2 } from "lucide-react";

import { cleanProductDescription, formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { LoanProduct } from "@/lib/schemas/loan";

export function ProductSummary({ product }: { product: LoanProduct }) {
  const durationText =
    product.max_duration_months > 12
      ? `${product.min_duration_months} à ${product.max_duration_months} mois (${product.min_duration_months / 12} à ${product.max_duration_months / 12} ans)`
      : `${product.min_duration_months} – ${product.max_duration_months} mois`;

  const stats = [
    {
      label: "Montant autorisé",
      value: `${formatFcfa(product.min_amount)} – ${formatFcfa(product.max_amount)}`,
    },
    {
      label: "Durée",
      value: durationText,
    },
    {
      label: "Taux annuel",
      value: `${Number(product.interest_rate).toLocaleString("fr-FR")} %`,
    },
  ];
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label}>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="mt-1 font-semibold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ProductCardItem({
  product,
  isSelected,
  onSelect,
}: {
  product: LoanProduct;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const description = cleanProductDescription(product.description);
  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all",
        isSelected
          ? "border-accent bg-accent/5 ring-2 ring-accent/20"
          : "border-border bg-card hover:border-accent/40 hover:bg-muted/30",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-foreground">{product.name}</h3>
          {isSelected ? (
            <CheckCircle2 className="size-5 shrink-0 text-accent" />
          ) : (
            <span className="size-5 shrink-0 rounded-full border border-border" />
          )}
        </div>
        {description ? (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="mt-4 border-t border-border/60 pt-3 text-xs">
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Taux d’intérêt :</span>
          <span className="font-semibold text-foreground">
            {Number(product.interest_rate).toLocaleString("fr-FR")} % / an
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Montant :</span>
          <span className="font-semibold text-foreground">
            {formatFcfa(product.min_amount)} – {formatFcfa(product.max_amount)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Durée :</span>
          <span className="font-semibold text-foreground">
            {product.max_duration_months > 12
              ? `${product.min_duration_months} à ${product.max_duration_months} mois (${product.min_duration_months / 12} à ${product.max_duration_months / 12} ans)`
              : `${product.min_duration_months} à ${product.max_duration_months} mois`}
          </span>
        </div>
      </div>
    </div>
  );
}

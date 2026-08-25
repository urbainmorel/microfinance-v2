import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";
import { formatFcfa } from "@/lib/format";

import type { LoanProduct, LoanRequestInput } from "@/lib/schemas/loan";
import type { UseFormReturn } from "react-hook-form";

function ProductSummary({ product }: { product: LoanProduct }) {
  const stats = [
    {
      label: "Montant autorisé",
      value: `${formatFcfa(product.min_amount)} – ${formatFcfa(product.max_amount)}`,
    },
    {
      label: "Durée",
      value: `${product.min_duration_months} – ${product.max_duration_months} mois`,
    },
    {
      label: "Taux mensuel",
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

export function LoanNeedFields({
  form,
  products,
  today,
}: {
  form: UseFormReturn<LoanRequestInput>;
  products: LoanProduct[];
  today: string;
}) {
  const {
    register,
    formState: { errors },
  } = form;
  const selectedProduct = products.find((product) => product.id === form.watch("productId"));

  return (
    <Card className="flex flex-col gap-5 border-border bg-card p-5 shadow-none sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Étape 1</p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
          Définissez votre besoin
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Choisissez l’offre, le montant et la durée qui correspondent à votre projet.
        </p>
      </div>
      <SelectField
        id="loan-product"
        label="Produit de prêt"
        placeholder="Sélectionner un produit"
        options={products.map((product) => ({ value: product.id, label: product.name }))}
        error={errors.productId?.message}
        {...register("productId")}
      />
      {selectedProduct ? <ProductSummary product={selectedProduct} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="loan-amount"
          label="Montant demandé (FCFA)"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          error={errors.amount?.message}
          {...register("amount")}
        />
        <FormField
          id="loan-duration"
          label="Durée (mois)"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          error={errors.durationMonths?.message}
          {...register("durationMonths")}
        />
      </div>
      <FormField
        id="loan-start-date"
        label="Date souhaitée de début"
        type="date"
        min={today}
        error={errors.startDate?.message}
        {...register("startDate")}
      />
    </Card>
  );
}

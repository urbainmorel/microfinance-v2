import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";

import type { LoanProduct, LoanRequestInput } from "@/lib/schemas/loan";
import type { UseFormReturn } from "react-hook-form";

export function LoanNeedFields({
  form,
  products,
  today,
  simulating,
  onSimulate,
}: {
  form: UseFormReturn<LoanRequestInput>;
  products: LoanProduct[];
  today: string;
  simulating: boolean;
  onSimulate: () => void;
}) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-foreground">Votre besoin</h2>
      <SelectField
        id="loan-product"
        label="Produit de prêt"
        placeholder="Sélectionner un produit"
        options={products.map((product) => ({ value: product.id, label: product.name }))}
        error={errors.productId?.message}
        {...register("productId")}
      />
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
      <Button type="button" variant="outline" onClick={onSimulate} disabled={simulating}>
        <Calculator aria-hidden /> {simulating ? "Calcul en cours…" : "Calculer ma simulation"}
      </Button>
    </Card>
  );
}

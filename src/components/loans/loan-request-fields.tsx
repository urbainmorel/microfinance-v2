import { Clock } from "lucide-react";
import { useEffect, useRef } from "react";

import { ProductCardItem, ProductSummary } from "@/components/loans/loan-product-items";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { formatFcfa } from "@/lib/format";
import {
  formatDurationDisplay,
  getAmountStepForProduct,
  getDynamicDurationBounds,
  getQuickAmountOptions,
  type DynamicDurationBounds,
} from "@/lib/loans/loan-tier-rules";
import { cn } from "@/lib/utils";

import type { LoanProduct, LoanRequestInput } from "@/lib/schemas/loan";
import type { UseFormReturn } from "react-hook-form";

export { ProductSummary } from "@/components/loans/loan-product-items";

export function LoanProductStep({
  form,
  products,
}: {
  form: UseFormReturn<LoanRequestInput>;
  products: LoanProduct[];
}) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;
  const selectedProductId = watch("productId");

  return (
    <Card className="flex flex-col gap-5 border-border bg-card p-5 shadow-none sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Étape 1</p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
          Sélectionnez votre produit de prêt
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Choisissez l’offre de financement qui correspond le mieux à votre projet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <ProductCardItem
            key={product.id}
            product={product}
            isSelected={selectedProductId === product.id}
            onSelect={() => setValue("productId", product.id, { shouldValidate: true })}
          />
        ))}
      </div>

      {errors.productId?.message ? (
        <p className="text-xs font-medium text-warning">{errors.productId.message}</p>
      ) : null}
    </Card>
  );
}

function syncInitialValues(form: UseFormReturn<LoanRequestInput>, product: LoanProduct) {
  const currentAmt = form.getValues("amount");
  const hasValidAmt =
    typeof currentAmt === "number" &&
    !isNaN(currentAmt) &&
    currentAmt >= product.min_amount &&
    currentAmt <= product.max_amount;

  if (!hasValidAmt) {
    form.setValue("amount", product.min_amount, { shouldValidate: true });
  }
  const amt = hasValidAmt ? currentAmt : product.min_amount;
  const bounds = getDynamicDurationBounds(product, amt);
  const currentDur = Number(form.getValues("durationMonths"));
  const hasValidDur =
    !isNaN(currentDur) && currentDur >= bounds.minDuration && currentDur <= bounds.maxDuration;

  if (!hasValidDur) {
    form.setValue("durationMonths", bounds.minDuration, { shouldValidate: true });
  }
}

function useAmountStepSync(
  form: UseFormReturn<LoanRequestInput>,
  selectedProduct: LoanProduct | undefined,
  amountNumber: number,
  bounds: DynamicDurationBounds,
) {
  const { setValue, watch } = form;
  const selectedProductId = selectedProduct?.id;
  const watchedDuration = watch("durationMonths");
  const prevProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedProduct) return;
    if (prevProductIdRef.current !== selectedProductId) {
      prevProductIdRef.current = selectedProductId ?? null;
      syncInitialValues(form, selectedProduct);
    }
  }, [selectedProductId, selectedProduct, form]);

  useEffect(() => {
    if (!selectedProduct || !amountNumber || isNaN(amountNumber) || amountNumber <= 0) return;
    const currentDuration = Number(watchedDuration);
    if (!currentDuration || isNaN(currentDuration)) return;

    if (currentDuration > bounds.maxDuration) {
      setValue("durationMonths", bounds.maxDuration, { shouldValidate: true });
    } else if (currentDuration < bounds.minDuration && amountNumber >= selectedProduct.min_amount) {
      setValue("durationMonths", bounds.minDuration, { shouldValidate: true });
    }
  }, [
    amountNumber,
    bounds.minDuration,
    bounds.maxDuration,
    selectedProduct,
    setValue,
    watchedDuration,
  ]);
}

function AmountField({
  form,
  selectedProduct,
  amountNumber,
  amountStep,
  quickAmounts,
}: {
  form: UseFormReturn<LoanRequestInput>;
  selectedProduct?: LoanProduct;
  amountNumber: number;
  amountStep: number;
  quickAmounts: number[];
}) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;
  return (
    <div className="flex flex-col gap-1.5">
      <FormField
        id="loan-amount"
        label="Montant demandé (FCFA)"
        type="number"
        min={selectedProduct?.min_amount ?? amountStep}
        max={selectedProduct?.max_amount}
        step={amountStep}
        inputMode="numeric"
        error={errors.amount?.message}
        {...register("amount", { valueAsNumber: true })}
      />
      {selectedProduct ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-muted-foreground">
            Fourchette : {formatFcfa(selectedProduct.min_amount)} à{" "}
            {formatFcfa(selectedProduct.max_amount)} (par pas de {formatFcfa(amountStep)})
          </p>
          {quickAmounts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">Montants :</span>
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setValue("amount", amt, { shouldValidate: true })}
                  className={cn(
                    "cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all",
                    amountNumber === amt
                      ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-accent"
                      : "border border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/60",
                  )}
                >
                  {formatFcfa(amt)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DurationField({
  form,
  watchedDuration,
  bounds,
}: {
  form: UseFormReturn<LoanRequestInput>;
  watchedDuration: unknown;
  bounds: DynamicDurationBounds;
}) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;
  return (
    <div className="flex flex-col gap-1.5">
      <FormField
        id="loan-duration"
        label="Durée de remboursement (mois)"
        type="number"
        min={bounds.minDuration}
        max={bounds.maxDuration}
        step={1}
        inputMode="numeric"
        error={errors.durationMonths?.message}
        {...register("durationMonths", { valueAsNumber: true })}
      />

      <div className="flex items-start gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Clock className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
        <span className="leading-snug">{bounds.helperText}</span>
      </div>

      {bounds.allowedDurations.length > 0 ? (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Choix rapide :</span>
          {bounds.allowedDurations.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setValue("durationMonths", m, { shouldValidate: true })}
              className={cn(
                "cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold transition-all",
                Number(watchedDuration) === m
                  ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-accent"
                  : "border border-border bg-card text-foreground hover:border-accent/40 hover:bg-muted/60",
              )}
            >
              {formatDurationDisplay(m)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LoanAmountStep({
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
    watch,
    formState: { errors },
  } = form;
  const selectedProductId = watch("productId");
  const watchedAmount = watch("amount");
  const watchedDuration = watch("durationMonths");

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const amountNumber = Number(watchedAmount);
  const amountStep = getAmountStepForProduct(selectedProduct);
  const quickAmounts = getQuickAmountOptions(selectedProduct);
  const bounds = getDynamicDurationBounds(selectedProduct, amountNumber);

  useAmountStepSync(form, selectedProduct, amountNumber, bounds);

  return (
    <Card className="flex flex-col gap-5 border-border bg-card p-5 shadow-none sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Étape 2</p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
          Montant, durée et date souhaitée
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {selectedProduct
            ? `Indiquez les détails pour l’offre ${selectedProduct.name}. La durée s’adapte automatiquement au montant demandé.`
            : "Indiquez le montant demandé, la durée du remboursement et la date de démarrage."}
        </p>
      </div>

      {selectedProduct ? <ProductSummary product={selectedProduct} /> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <AmountField
          form={form}
          selectedProduct={selectedProduct}
          amountNumber={amountNumber}
          amountStep={amountStep}
          quickAmounts={quickAmounts}
        />
        <DurationField form={form} watchedDuration={watchedDuration} bounds={bounds} />
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

"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarRange, HandCoins } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { cn } from "@/lib/utils";

import type { LoanProduct } from "@/lib/schemas/loan";

const PRODUCT_FIELDS =
  "id,name,description,min_amount,max_amount,min_duration_months,max_duration_months,interest_rate,interest_method,processing_fee_percent,processing_fee_flat,management_fee_percent,management_fee_flat,insurance_rate,guarantee_rate,mandatory_savings_rate";

export function useActiveLoanProducts() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["active-loan-products"],
    staleTime: 60_000,
    queryFn: async (): Promise<LoanProduct[]> => {
      const { data, error } = await supabase
        .from("loan_products")
        .select(PRODUCT_FIELDS)
        .eq("is_active", true)
        .order("min_amount", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LoanProduct[];
    },
  });
}

export function LoanProducts() {
  const products = useActiveLoanProducts();
  if (products.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1].map((item) => (
          <Skeleton key={item} className="h-[210px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (products.isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Offres indisponibles"
        hint="Les produits de prêt n’ont pas pu être chargés."
      />
    );
  }
  if (!products.data?.length) {
    return (
      <EmptyState
        icon={HandCoins}
        title="Aucune offre disponible"
        hint="De nouveaux produits de prêt seront proposés prochainement."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {products.data.map((product) => (
        <Card key={product.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">{product.name}</h3>
              {product.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
              ) : null}
            </div>
            <span className="shrink-0 rounded-pill bg-pastel-green px-3 py-1 text-xs font-bold text-accent">
              {Number(product.interest_rate).toLocaleString("fr-FR")} % / mois
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Montant</p>
              <p className="font-semibold text-foreground">
                {formatFcfa(product.min_amount)} à {formatFcfa(product.max_amount)}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarRange className="size-3.5" aria-hidden /> Durée
              </p>
              <p className="font-semibold text-foreground">
                {product.min_duration_months} à {product.max_duration_months} mois
              </p>
            </div>
          </div>
          <Link
            href={`/client/loans/request?product=${product.id}`}
            className={cn(buttonVariants({ variant: "accent", size: "sm" }), "mt-5 w-full")}
          >
            Simuler ce prêt
          </Link>
        </Card>
      ))}
    </div>
  );
}

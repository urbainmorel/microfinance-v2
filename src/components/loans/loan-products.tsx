"use client";

import { AlertCircle, CalendarRange, ExternalLink, HandCoins, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { KycRequiredModal } from "@/components/kyc/kyc-required-modal";
import { LoanRequestForm } from "@/components/loans/loan-request-form";
import { useActiveLoanProducts } from "@/components/loans/use-loan-request";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cleanProductDescription, formatFcfa } from "@/lib/format";
import { useProfile } from "@/lib/hooks/use-profile";
import { cn } from "@/lib/utils";

import type { LoanProduct } from "@/lib/schemas/loan";
import type { MouseEvent } from "react";

function shouldOpenModal(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function LoanProductCard({
  product,
  isKycVerified,
  select,
}: {
  product: LoanProduct;
  isKycVerified: boolean;
  select: () => void;
}) {
  const href = isKycVerified ? `/client/loans/request?product=${product.id}` : "/client/kyc";
  const description = cleanProductDescription(product.description);
  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border bg-card p-0 shadow-none transition-colors hover:border-accent/35">
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              Offre de financement
            </p>
            <h3 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
              {product.name}
            </h3>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <span className="shrink-0 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-bold text-accent">
            {Number(product.interest_rate).toLocaleString("fr-FR")} % / an
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-muted/35 p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Montant disponible</p>
            <p className="mt-1 font-semibold leading-5 text-foreground">
              {formatFcfa(product.min_amount)} à {formatFcfa(product.max_amount)}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarRange className="size-3.5" aria-hidden /> Durée
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {product.min_duration_months} à {product.max_duration_months} mois
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-5 py-4 sm:px-6">
        <Link
          href={href}
          onClick={(event) => {
            if (!isKycVerified) {
              event.preventDefault();
              select();
              return;
            }
            if (!shouldOpenModal(event)) return;
            event.preventDefault();
            select();
          }}
          aria-haspopup={isKycVerified ? "dialog" : undefined}
          className={cn(
            buttonVariants({ variant: isKycVerified ? "accent" : "outline", size: "sm" }),
            "w-full",
          )}
        >
          {!isKycVerified ? <Lock className="mr-1.5 size-3.5 text-warning" aria-hidden /> : null}
          Demander ce prêt
        </Link>
      </div>
    </Card>
  );
}

function LoanRequestModal({ productId, close }: { productId: string | null; close: () => void }) {
  const handleOpenChange = (open: boolean) => {
    if (!open) close();
  };

  return (
    <Modal
      open={productId !== null}
      onOpenChange={handleOpenChange}
      title="Demander un prêt"
      description="Un parcours guidé en trois étapes pour comprendre le coût, préparer le dossier et confirmer la demande."
      className="max-w-4xl"
    >
      {productId ? <LoanRequestForm defaultProductId={productId} onClose={close} /> : null}
      {productId ? (
        <div className="mt-5 border-t border-border pt-4 text-center">
          <Link
            href={`/client/loans/request?product=${productId}`}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Ouvrir sur une page dédiée <ExternalLink className="size-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </Modal>
  );
}

function ProductsLoading() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((item) => (
        <Skeleton key={item} className="h-[210px] w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function LoanProducts() {
  const profileQuery = useProfile();
  const profile = profileQuery.data;
  const isKycVerified = profile?.kyc_status === "COMPLETED";
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const products = useActiveLoanProducts();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const handleCloseModal = () => setSelectedProductId(null);

  function handleSelect(productId: string) {
    if (!isKycVerified) {
      setKycModalOpen(true);
      return;
    }
    setSelectedProductId(productId);
  }

  if (products.isPending || profileQuery.isPending) return <ProductsLoading />;
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
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {products.data.map((product) => (
          <LoanProductCard
            key={product.id}
            product={product}
            isKycVerified={isKycVerified}
            select={() => handleSelect(product.id)}
          />
        ))}
      </div>
      <LoanRequestModal
        productId={isKycVerified ? selectedProductId : null}
        close={handleCloseModal}
      />
      <KycRequiredModal
        open={kycModalOpen}
        onOpenChange={setKycModalOpen}
        status={profile?.kyc_status}
      />
    </>
  );
}

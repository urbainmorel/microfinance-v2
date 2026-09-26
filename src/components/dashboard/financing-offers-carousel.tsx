"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { OffersCarouselUi } from "@/components/dashboard/offers-carousel-ui";
import { KycRequiredModal } from "@/components/kyc/kyc-required-modal";
import { LoanRequestForm } from "@/components/loans/loan-request-form";
import { useActiveLoanProducts } from "@/components/loans/use-loan-request";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/lib/hooks/use-profile";

function RequestModal({ productId, close }: { productId: string | null; close: () => void }) {
  const handleOpenChange = (open: boolean) => {
    if (!open) close();
  };

  return (
    <Modal
      open={productId !== null}
      onOpenChange={handleOpenChange}
      title="Demander un prêt"
      description="Simulez votre financement, préparez votre dossier puis confirmez votre demande."
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

function OffersLoading() {
  return (
    <section aria-label="Chargement des offres de financement">
      <Skeleton className="mb-4 h-8 w-64 rounded-lg" />
      <Skeleton className="h-[255px] w-full rounded-[22px]" />
    </section>
  );
}

/**
 * Conteneur du carrousel des offres de financement.
 * Gère le chargement des produits, la vérification KYC et les modales de souscription.
 */
export function FinancingOffersCarousel() {
  const { data: profile } = useProfile();
  const isKycVerified = profile?.kyc_status === "COMPLETED";
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const products = useActiveLoanProducts();
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const handleCloseModal = () => setSelectedProductId(null);

  if (products.isPending) return <OffersLoading />;
  if (products.isError || !products.data?.length) return null;

  function handleSelect(productId: string) {
    if (!isKycVerified) {
      setKycModalOpen(true);
      return;
    }
    setSelectedProductId(productId);
  }

  return (
    <>
      <OffersCarouselUi
        products={products.data}
        activeIndex={activeIndex}
        isKycVerified={isKycVerified}
        onActiveIndexChange={setActiveIndex}
        onSelectProduct={handleSelect}
      />

      <KycRequiredModal
        open={kycModalOpen}
        onOpenChange={setKycModalOpen}
        status={profile?.kyc_status}
      />

      <RequestModal productId={selectedProductId} close={handleCloseModal} />
    </>
  );
}

"use client";

import { ArrowLeft, ArrowRight, BadgeCheck, Lock } from "lucide-react";
import Link from "next/link";
import { useRef, type MouseEvent } from "react";

import { FinancingOfferMetrics } from "@/components/dashboard/financing-offer-metrics";
import { Button, buttonVariants } from "@/components/ui/button";
import { cleanProductDescription } from "@/lib/loans/format";
import { cn } from "@/lib/utils";

import type { LoanProduct } from "@/lib/schemas/loan";

function shouldOpenModal(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function FinancingOfferButton({
  href,
  orange,
  isKycVerified,
  select,
}: {
  href: string;
  orange: boolean;
  isKycVerified: boolean;
  select: () => void;
}) {
  return (
    <Link
      href={isKycVerified ? href : "/client/kyc"}
      onClick={(event) => {
        if (!isKycVerified || shouldOpenModal(event)) {
          event.preventDefault();
          select();
        }
      }}
      aria-haspopup="dialog"
      className={cn(
        buttonVariants({ size: "default" }),
        "min-w-40",
        orange
          ? "bg-[#20150d] text-white hover:bg-[#382419]"
          : "bg-[#111418] text-white hover:bg-[#252a30]",
      )}
    >
      {!isKycVerified ? <Lock className="mr-1 size-3.5 text-warning" aria-hidden /> : null}
      Demander ce prêt
    </Link>
  );
}

function FinancingOffer({
  product,
  index,
  isKycVerified,
  select,
}: {
  product: LoanProduct;
  index: number;
  isKycVerified: boolean;
  select: () => void;
}) {
  const orange = index % 2 === 1;
  const href = `/client/loans/request?product=${product.id}`;

  return (
    <article
      className={cn(
        "relative min-w-full snap-center overflow-hidden rounded-[22px] border p-5 sm:p-6",
        orange
          ? "border-[#e67923] bg-[linear-gradient(135deg,#ffbd6a_0%,#f3973f_48%,#e47724_100%)] text-[#20150d]"
          : "border-[#d5d9df] bg-[linear-gradient(135deg,#f5f6f7_0%,#e4e7eb_52%,#cfd4da_100%)] text-[#111418]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-20 size-52 rounded-full border-[30px]",
          orange ? "border-[#cb641c]/30" : "border-white/55",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute -bottom-24 right-32 size-40 rotate-12 rounded-[38px] border-[22px]",
          orange ? "border-[#ffcb89]/35" : "border-[#b8bec6]/35",
        )}
        aria-hidden
      />

      <div className="relative z-10 grid min-h-[205px] gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] opacity-65">
            <BadgeCheck className="size-3.5" aria-hidden />
            Solution {String(index + 1).padStart(2, "0")}
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
            {product.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 max-w-xl text-sm leading-5 opacity-70">
            {cleanProductDescription(product.description) ??
              "Une solution de financement flexible, conçue pour accompagner vos projets."}
          </p>
          <FinancingOfferMetrics product={product} />
        </div>
        <div className="flex items-center lg:justify-end">
          <FinancingOfferButton
            href={href}
            orange={orange}
            isKycVerified={isKycVerified}
            select={select}
          />
        </div>
      </div>
    </article>
  );
}

function CarouselHeader({
  activeIndex,
  count,
  goTo,
}: {
  activeIndex: number;
  count: number;
  goTo: (index: number) => void;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2
        id="financing-offers-title"
        className="font-display text-2xl font-bold tracking-[-0.035em] text-foreground"
      >
        Offres de financement
      </h2>
      {count > 1 ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Offre précédente"
          >
            <ArrowLeft aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Offre suivante"
          >
            <ArrowRight aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CarouselIndicators({
  products,
  activeIndex,
  goTo,
}: {
  products: LoanProduct[];
  activeIndex: number;
  goTo: (index: number) => void;
}) {
  if (products.length < 2) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2" aria-label="Choisir une offre">
      {products.map((product, index) => (
        <button
          key={product.id}
          type="button"
          onClick={() => goTo(index)}
          className={cn(
            "h-1.5 rounded-full transition-all",
            activeIndex === index ? "w-8 bg-accent" : "w-2.5 bg-border hover:bg-muted-foreground",
          )}
          aria-label={`Afficher l’offre ${index + 1}`}
          aria-current={activeIndex === index ? "true" : undefined}
        />
      ))}
    </div>
  );
}

export function OffersCarouselUi({
  products,
  activeIndex,
  isKycVerified,
  onActiveIndexChange,
  onSelectProduct,
}: {
  products: LoanProduct[];
  activeIndex: number;
  isKycVerified: boolean;
  onActiveIndexChange: (index: number) => void;
  onSelectProduct: (productId: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const count = products.length;

  function goTo(index: number) {
    const viewport = viewportRef.current;
    if (!viewport || !count) return;
    const nextIndex = (index + count) % count;
    viewport.scrollTo({ left: nextIndex * viewport.clientWidth, behavior: "smooth" });
    onActiveIndexChange(nextIndex);
  }

  return (
    <section id="financing-offers" className="scroll-mt-6" aria-labelledby="financing-offers-title">
      <CarouselHeader activeIndex={activeIndex} count={count} goTo={goTo} />

      <div
        ref={viewportRef}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-[22px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Diaporama des offres de financement"
        onScroll={(event) => {
          const viewport = event.currentTarget;
          if (!viewport.clientWidth) return;
          onActiveIndexChange(Math.round(viewport.scrollLeft / viewport.clientWidth));
        }}
      >
        {products.map((product, index) => (
          <FinancingOffer
            key={product.id}
            product={product}
            index={index}
            isKycVerified={isKycVerified}
            select={() => onSelectProduct(product.id)}
          />
        ))}
      </div>

      <CarouselIndicators products={products} activeIndex={activeIndex} goTo={goTo} />
    </section>
  );
}

"use client";

import { ArrowRight, Landmark, Menu, ShieldCheck, User, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PlatformName } from "@/components/brand/platform-name";

function BrandLogo({ onSelect }: { onSelect: () => void }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" onClick={onSelect}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm shadow-accent/20 transition-transform duration-200 group-hover:scale-105 sm:size-10">
        <Landmark className="size-4.5 sm:size-5" strokeWidth={2} aria-hidden />
      </span>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <PlatformName
            fallback="Azari Microfinance"
            className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg"
          />
          <span className="hidden items-center gap-1.5 rounded-full border border-accent/20 bg-finance-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent md:inline-flex">
            <ShieldCheck className="size-3.5" />
            Agréée UMOA
          </span>
        </div>
        <span className="hidden text-[11px] font-medium tracking-wide text-muted-foreground sm:block">
          Solutions de crédit responsables
        </span>
      </div>
    </Link>
  );
}

function DesktopNav() {
  return (
    <nav className="hidden items-center gap-7 lg:flex">
      <a
        href="#produits"
        className="text-sm font-semibold text-muted-foreground transition hover:text-accent"
      >
        Nos Prêts
      </a>
      <a
        href="#avantages"
        className="text-sm font-semibold text-muted-foreground transition hover:text-accent"
      >
        Avantages
      </a>
      <a
        href="#avis"
        className="text-sm font-semibold text-muted-foreground transition hover:text-accent"
      >
        Témoignages
      </a>
      <Link
        href="/contact"
        className="text-sm font-semibold text-muted-foreground transition hover:text-accent"
      >
        Contact
      </Link>
    </nav>
  );
}

function HeaderActions({
  mobileMenuOpen,
  onToggleMobileMenu,
}: {
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2.5 sm:flex">
        <Link
          href="/auth/login"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition hover:border-foreground/20 hover:bg-muted/60 active:bg-muted"
        >
          Espace client
        </Link>
        <Link
          href="/auth/register"
          className="px-4.5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-foreground shadow-md shadow-accent/25 transition hover:bg-finance-deep active:translate-y-px"
        >
          <span>Créer un compte</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="flex items-center gap-1.5 sm:hidden">
        <Link
          href="/auth/login"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground active:bg-muted"
          aria-label="Connexion espace client"
        >
          <User className="size-3.5 text-accent" />
          <span>Connexion</span>
        </Link>

        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm focus:outline-none active:bg-muted"
          aria-label={
            mobileMenuOpen ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation"
          }
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
        </button>
      </div>
    </div>
  );
}

function MobileMenuDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-t border-border bg-card px-4 py-5 shadow-2xl duration-200 animate-in fade-in slide-in-from-top-1 sm:hidden">
      <nav className="flex flex-col space-y-1 font-display">
        <a
          href="#produits"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <span>Nos Prêts</span>
          <ArrowRight className="size-4 text-muted-foreground" />
        </a>
        <a
          href="#avantages"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <span>Avantages & Garanties</span>
          <ArrowRight className="size-4 text-muted-foreground" />
        </a>
        <a
          href="#avis"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <span>Témoignages Clients</span>
          <ArrowRight className="size-4 text-muted-foreground" />
        </a>
        <Link
          href="/contact"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <span>Contact & Support</span>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      </nav>

      <div className="mt-4 border-t border-border/80 pt-4">
        <Link
          href="/auth/register"
          onClick={onClose}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-display text-sm font-bold text-accent-foreground shadow-md shadow-accent/25 transition active:scale-[0.98]"
        >
          <span>Faire une demande de prêt</span>
          <ArrowRight className="size-4" />
        </Link>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-accent">
          <ShieldCheck className="size-4" />
          <span>Établissement agréé zone UMOA</span>
        </div>
      </div>
    </div>
  );
}

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-card/95 shadow-sm">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:h-20 lg:px-8">
        <BrandLogo onSelect={() => setMobileMenuOpen(false)} />
        <DesktopNav />
        <HeaderActions
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
      </div>

      {mobileMenuOpen && <MobileMenuDrawer onClose={() => setMobileMenuOpen(false)} />}
    </header>
  );
}

"use client";

import { ArrowRight, Menu, ShieldCheck, User, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BrandLogoFull } from "@/components/brand/brand-symbol";

function BrandLogo({ onSelect }: { onSelect: () => void }) {
  return (
    <Link
      href="/"
      className="group flex items-center transition-transform duration-200 hover:opacity-95"
      onClick={onSelect}
      aria-label="Accueil Azari Microfinance"
    >
      <BrandLogoFull priority className="h-[30px] w-auto object-contain sm:h-[36px] md:h-[40px]" />
    </Link>
  );
}

function DesktopNav() {
  return (
    <nav className="hidden items-center gap-7 lg:flex">
      <a
        href="#produits"
        className="text-sm font-semibold text-white/75 transition hover:text-white"
      >
        Nos Prêts
      </a>
      <a
        href="#avantages"
        className="text-sm font-semibold text-white/75 transition hover:text-white"
      >
        Avantages
      </a>
      <a href="#avis" className="text-sm font-semibold text-white/75 transition hover:text-white">
        Témoignages
      </a>
      <Link
        href="/contact"
        className="text-sm font-semibold text-white/75 transition hover:text-white"
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
          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:border-white/35 hover:bg-white/15 active:bg-white/20"
        >
          Espace client
        </Link>
        <Link
          href="/auth/register"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-md shadow-black/25 transition hover:bg-sky-500 active:translate-y-px sm:px-6"
        >
          <span>Créer un compte</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="flex items-center gap-1.5 sm:hidden">
        <Link
          href="/auth/login"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 text-xs font-semibold text-white active:bg-white/20"
          aria-label="Connexion espace client"
        >
          <User className="size-3.5 text-sky-300" />
          <span>Connexion</span>
        </Link>

        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="flex size-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white shadow-sm focus:outline-none active:bg-white/20"
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
    <div className="border-t border-white/10 bg-finance-ink px-4 py-5 shadow-2xl duration-200 animate-in fade-in slide-in-from-top-1 sm:hidden">
      <nav className="flex flex-col space-y-1 font-display">
        <a
          href="#produits"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          <span>Nos Prêts</span>
          <ArrowRight className="size-4 text-white/50" />
        </a>
        <a
          href="#avantages"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          <span>Avantages & Garanties</span>
          <ArrowRight className="size-4 text-white/50" />
        </a>
        <a
          href="#avis"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          <span>Témoignages Clients</span>
          <ArrowRight className="size-4 text-white/50" />
        </a>
        <Link
          href="/contact"
          onClick={onClose}
          className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          <span>Contact & Support</span>
          <ArrowRight className="size-4 text-white/50" />
        </Link>
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <Link
          href="/auth/register"
          onClick={onClose}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-display text-sm font-bold text-white shadow-md shadow-black/25 transition active:scale-[0.98]"
        >
          <span>Faire une demande de prêt</span>
          <ArrowRight className="size-4" />
        </Link>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-sky-300">
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
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-finance-ink/95 shadow-md backdrop-blur-md">
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

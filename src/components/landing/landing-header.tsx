"use client";

import { ArrowRight, Landmark, Menu, ShieldCheck, User, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PlatformName } from "@/components/brand/platform-name";

function BrandLogo({ onSelect }: { onSelect: () => void }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" onClick={onSelect}>
      <span className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm transition-transform duration-200 group-hover:scale-105 sm:size-10">
        <Landmark className="size-4.5 sm:size-5" strokeWidth={2.2} aria-hidden />
      </span>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <PlatformName
            fallback="Azari Microfinance"
            className="font-display text-base font-extrabold tracking-tight text-slate-900 sm:text-lg"
          />
          <span className="hidden items-center gap-1.5 rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 md:inline-flex">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
            Agrément UMOA
          </span>
        </div>
        <span className="hidden text-[11px] font-medium tracking-wide text-slate-500 sm:block">
          Institution financière agréée
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
        className="text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors hover:text-slate-950"
      >
        Nos Prêts
      </a>
      <a
        href="#avantages"
        className="text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors hover:text-slate-950"
      >
        Garanties & Sécurité
      </a>
      <a
        href="#avis"
        className="text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors hover:text-slate-950"
      >
        Témoignages
      </a>
      <Link
        href="/contact"
        className="text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors hover:text-slate-950"
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
          className="lg:px-4.5 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 lg:h-10"
        >
          Espace Client
        </Link>
        <Link
          href="/auth/register"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition hover:bg-slate-800 active:translate-y-px lg:h-10 lg:px-5"
        >
          <span>Demande de prêt</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="flex items-center gap-1.5 sm:hidden">
        <Link
          href="/auth/login"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 active:bg-slate-100"
          aria-label="Connexion espace client"
        >
          <User className="size-3.5 text-slate-700" />
          <span>Connexion</span>
        </Link>

        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm focus:outline-none active:bg-slate-100"
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
    <div className="border-t border-slate-200 bg-white px-4 py-5 shadow-2xl duration-200 animate-in fade-in slide-in-from-top-1 sm:hidden">
      <nav className="flex flex-col space-y-1">
        <a
          href="#produits"
          onClick={onClose}
          className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 active:bg-slate-100"
        >
          <span>Nos Offres de Financement</span>
          <ArrowRight className="size-4 text-slate-400" />
        </a>
        <a
          href="#avantages"
          onClick={onClose}
          className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 active:bg-slate-100"
        >
          <span>Garanties & Sécurité Bancaire</span>
          <ArrowRight className="size-4 text-slate-400" />
        </a>
        <a
          href="#avis"
          onClick={onClose}
          className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 active:bg-slate-100"
        >
          <span>Avis Entrepreneurs</span>
          <ArrowRight className="size-4 text-slate-400" />
        </a>
        <Link
          href="/contact"
          onClick={onClose}
          className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 active:bg-slate-100"
        >
          <span>Contact & Support</span>
          <ArrowRight className="size-4 text-slate-400" />
        </Link>
      </nav>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <Link
          href="/auth/register"
          onClick={onClose}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 font-display text-sm font-bold uppercase tracking-wider text-white shadow-md active:bg-slate-800"
        >
          <span>Faire une demande de prêt</span>
          <ArrowRight className="size-4" />
        </Link>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="size-4" />
          <span>Établissement financier agréé zone UMOA</span>
        </div>
      </div>
    </div>
  );
}

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
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

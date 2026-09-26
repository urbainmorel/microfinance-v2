import { ArrowRight, Landmark, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { PlatformName } from "@/components/brand/platform-name";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md transition-all">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo & Slogan */}
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-white shadow-md shadow-accent/20 transition-transform group-hover:scale-105">
            <Landmark className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <PlatformName
                fallback="Azari Microfinance"
                className="font-display text-xl font-bold tracking-tight text-foreground"
              />
              <span className="hidden items-center gap-1 rounded-full bg-finance-soft px-2 py-0.5 text-[11px] font-semibold text-accent sm:inline-flex">
                <ShieldCheck className="size-3" /> Agréée UMOA
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Solutions de crédit responsables
            </span>
          </div>
        </Link>

        {/* Navigation Desktop */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#produits"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Nos Prêts
          </a>
          <a
            href="#avantages"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Avantages
          </a>
          <a
            href="#avis"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Témoignages
          </a>
          <Link
            href="/contact"
            className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </Link>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/auth/login"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition hover:border-foreground/20 hover:bg-muted/60 sm:h-11 sm:px-4 sm:text-sm"
          >
            Se connecter
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-accent px-3.5 text-xs font-semibold text-accent-foreground shadow-md shadow-accent/25 transition hover:bg-finance-deep active:translate-y-px sm:h-11 sm:gap-2 sm:px-5 sm:text-sm"
          >
            <span>Créer un compte</span>
            <ArrowRight className="size-3.5 sm:size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

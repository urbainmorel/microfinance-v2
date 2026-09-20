import { ArrowRight, CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function HeroContent() {
  return (
    <div className="flex flex-col items-start lg:col-span-7">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-finance-soft px-3.5 py-1.5 text-xs font-bold text-accent shadow-sm">
        <ShieldCheck className="size-3.5 text-accent" />
        <span>Financement rapide & sécurisé pour particuliers et professionnels</span>
      </div>

      <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.12]">
        Des offres de prêts flexibles pour faire grandir votre activité.
      </h1>

      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
        Accédez à des solutions de crédit claires et transparentes à partir de{" "}
        <strong>5% par an</strong>. Des conditions avantageuses, sans lourdeur administrative, avec
        déblocage direct.
      </p>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-foreground/85">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-accent" />
          <span>Taux clairs dès 5%</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-accent" />
          <span>Dépôt de garantie dès 5%</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-accent" />
          <span>Réponse en 24h à 48h</span>
        </div>
      </div>

      <div className="mt-8 flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row sm:items-center">
        <Link
          href="/auth/register"
          className="inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-accent px-8 font-display text-base font-bold text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:bg-finance-deep hover:shadow-xl active:translate-y-px"
        >
          <span>Obtenir un prêt</span>
          <ArrowRight className="size-5" />
        </Link>

        <Link
          href="/auth/login"
          className="inline-flex h-14 items-center justify-center rounded-xl border border-border bg-card px-7 font-display text-base font-bold text-foreground shadow-sm transition-all hover:border-foreground/20 hover:bg-muted/60"
        >
          Espace client
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground">
        <ShieldCheck className="size-5 text-accent" />
        <span>Protection des données certifiée • Dépôt de garantie séquestré et sécurisé</span>
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative lg:col-span-5">
      <div className="relative mx-auto max-w-md lg:max-w-none">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-accent/10">
          <div className="relative aspect-[4/3] w-full">
            <Image
              src="/images/landing/hero-entrepreneur.jpg"
              alt="Entrepreneure souriante gérant son financement dans sa boutique"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
              priority
              className="object-cover object-center transition duration-500 hover:scale-105"
            />
          </div>
        </div>

        <div className="absolute -bottom-6 -left-4 flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-xl backdrop-blur-md sm:-left-8">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Déblocage Express</p>
            <p className="font-display text-base font-bold text-foreground">
              Jusqu’à 5 000 000 FCFA
            </p>
          </div>
        </div>

        <div className="absolute -right-2 -top-4 rounded-2xl border border-accent/20 bg-accent px-4 py-2.5 text-accent-foreground shadow-lg shadow-accent/30 sm:-right-6">
          <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">Taux dès</p>
          <p className="font-display text-lg font-extrabold leading-none">5% / an</p>
        </div>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-finance-soft/30 via-background to-background pb-20 pt-12 md:pb-28 md:pt-16">
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <HeroContent />
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

import { ArrowRight, CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function HeroContent() {
  return (
    <div className="flex flex-col items-start lg:col-span-7">
      <div className="mb-6 inline-flex items-center rounded-full bg-finance-soft px-3.5 py-1.5 text-xs font-bold text-accent sm:text-sm">
        <span>Financement rapide & sécurisé pour particuliers et professionnels</span>
      </div>

      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.12]">
        Des offres de prêts flexibles pour faire grandir votre activité.
      </h1>

      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Accédez à des solutions de crédit claires et transparentes à partir de{" "}
        <strong className="text-foreground">5% par an</strong>. Des conditions avantageuses, sans
        lourdeur administrative, avec déblocage direct après constitution de la garantie.
      </p>

      {/* Checklist de rassurance nette */}
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-semibold text-foreground/85 sm:text-base">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4.5 text-accent" />
          <span>Taux dès 5% / an</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4.5 text-accent" />
          <span>Garantie dès 5% restituée</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4.5 text-accent" />
          <span>Décision sous 24h à 48h</span>
        </div>
      </div>

      {/* Boutons CTA avec marges internes généreuses et ergonomie tactile */}
      <div className="mt-8 flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row sm:items-center">
        <Link
          href="/auth/register"
          className="sm:h-15 inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-accent px-8 font-display text-base font-bold text-accent-foreground shadow-lg shadow-accent/25 transition-all hover:bg-finance-deep hover:shadow-xl active:translate-y-px sm:px-10"
        >
          <span>Simuler & Obtenir un prêt</span>
          <ArrowRight className="size-5" />
        </Link>

        <Link
          href="/auth/login"
          className="sm:h-15 inline-flex h-14 items-center justify-center rounded-2xl border-2 border-border bg-card px-8 font-display text-base font-bold text-foreground shadow-sm transition-all hover:border-foreground/20 hover:bg-muted/60 sm:px-10"
        >
          Espace client
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground sm:text-sm">
        <ShieldCheck className="size-5 shrink-0 text-accent" />
        <span>Données certifiées • Compte de cantonnement sécurisé conforme UMOA</span>
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mt-8 lg:col-span-5 lg:mt-0">
      <div className="relative mx-auto max-w-md lg:max-w-none">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-2xl shadow-accent/10">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
            <Image
              src="/images/landing/hero-entrepreneur.webp"
              alt="Entrepreneure agroalimentaire souriante développant son unité artisanale de jus de fruits frais avec Azari Microfinance"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
              priority
              className="hover:scale-103 object-cover object-center transition duration-500"
            />
          </div>

          {/* Badge Taux d'angle dans la couleur Accent */}
          <div className="absolute right-5 top-5 rounded-2xl border border-accent/20 bg-accent px-4 py-2 text-accent-foreground shadow-lg shadow-accent/30">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider opacity-90">
              Taux dès
            </p>
            <p className="font-display text-base font-extrabold leading-tight">5% / an</p>
          </div>
        </div>

        {/* Badge Flottant Solide */}
        <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-4 shadow-xl sm:-left-6 sm:right-auto">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Déblocage Express</p>
            <p className="font-display text-base font-bold text-foreground">
              Jusqu’à 5 000 000 FCFA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="lg:pt-18 relative overflow-hidden bg-gradient-to-b from-finance-soft/30 via-background to-background pb-20 pt-10 sm:pb-24 sm:pt-14 lg:pb-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <HeroContent />
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

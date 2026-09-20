import { ArrowRight, BadgeCheck, BadgePercent, Check, Clock, Shield } from "lucide-react";
import Link from "next/link";

function EssentialProductCard() {
  return (
    <div className="relative flex flex-col justify-between rounded-3xl border border-border bg-card p-8 shadow-card transition duration-300 hover:border-accent/40 hover:shadow-lift">
      <div>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Produit 1 • Court terme
          </span>
          <span className="text-xs font-medium text-muted-foreground">Besoin immédiat</span>
        </div>

        <h3 className="mt-4 font-display text-2xl font-bold text-foreground">Prêt Essentiel</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Idéal pour la trésorerie rapide, réapprovisionnement de commerce et dépenses imprévues.
        </p>

        <div className="mt-6 rounded-2xl border border-border/50 bg-muted/50 p-4">
          <p className="text-xs font-medium text-muted-foreground">Montant disponible</p>
          <p className="mt-0.5 font-display text-2xl font-extrabold text-foreground">
            100 000 à 500 000 <span className="text-sm font-bold text-muted-foreground">FCFA</span>
          </p>
        </div>

        <div className="mt-6 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <BadgePercent className="size-4 text-accent" />
              <span>Taux annuel effectif</span>
            </div>
            <span className="font-display text-lg font-bold text-accent">8,5%</span>
          </div>

          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <Shield className="size-4 text-accent" />
              <span>Dépôt de garantie</span>
            </div>
            <span className="font-display text-lg font-bold text-foreground">10%</span>
          </div>

          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <Clock className="size-4 text-accent" />
              <span>Durée de remboursement</span>
            </div>
            <span className="text-sm font-bold text-foreground">6 à 12 mois</span>
          </div>
        </div>

        <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <Check className="size-3.5 text-success" />
            <span>Validation express sous 24h ouvrées</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="size-3.5 text-success" />
            <span>Remboursement souple par mensualités</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="size-3.5 text-success" />
            <span>Garantie restituée à la fin du crédit</span>
          </li>
        </ul>
      </div>

      <div className="mt-8 pt-4">
        <Link
          href="/auth/register"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-foreground font-display text-sm font-bold text-card transition hover:bg-foreground/90 active:translate-y-px"
        >
          <span>Obtenir ce prêt</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function GrowthProductCard() {
  return (
    <div className="relative flex flex-col justify-between rounded-3xl border-2 border-accent bg-card p-8 shadow-xl shadow-accent/10 transition duration-300 hover:shadow-2xl">
      <div className="absolute -top-3.5 right-6 rounded-full bg-accent px-4 py-1 text-xs font-bold text-accent-foreground shadow-sm">
        Meilleur Taux
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-finance-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">
            Produit 2 • Moyen terme
          </span>
          <span className="text-xs font-medium text-accent">Projets d’envergure</span>
        </div>

        <h3 className="mt-4 font-display text-2xl font-bold text-foreground">Prêt Croissance</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Conçu pour équiper votre activité, financer l’achat de matériel ou développer votre PME.
        </p>

        <div className="mt-6 rounded-2xl border border-accent/20 bg-finance-soft/50 p-4">
          <p className="text-xs font-medium text-accent">Montant disponible</p>
          <p className="mt-0.5 font-display text-2xl font-extrabold text-foreground">
            1 000 000 à 5 000 000{" "}
            <span className="text-sm font-bold text-muted-foreground">FCFA</span>
          </p>
        </div>

        <div className="mt-6 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <BadgePercent className="size-4 text-accent" />
              <span>Taux annuel préférentiel</span>
            </div>
            <span className="font-display text-xl font-black text-accent">5%</span>
          </div>

          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <Shield className="size-4 text-accent" />
              <span>Dépôt de garantie allégé</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">5%</span>
          </div>

          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <Clock className="size-4 text-accent" />
              <span>Durée de remboursement</span>
            </div>
            <span className="text-sm font-bold text-foreground">12 à 60 mois (1 à 5 ans)</span>
          </div>
        </div>

        <ul className="mt-6 space-y-2.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <Check className="size-3.5 font-bold text-accent" />
            <span>Taux avantageux de 5% par an</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="size-3.5 font-bold text-accent" />
            <span>Dépôt de garantie minime de 5%</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="size-3.5 font-bold text-accent" />
            <span>Accompagnement dédié et suivi sur-mesure</span>
          </li>
        </ul>
      </div>

      <div className="mt-8 pt-4">
        <Link
          href="/auth/register"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-display text-sm font-bold text-accent-foreground shadow-md shadow-accent/25 transition hover:bg-finance-deep active:translate-y-px"
        >
          <span>Obtenir ce prêt</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function LandingProducts() {
  return (
    <section id="produits" className="border-y border-border/70 bg-muted/40 py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
            <BadgeCheck className="size-3.5" />
            <span>Nos solutions de financement</span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Deux offres conçues pour vos projets
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Des conditions transparentes, sans frais cachés ni mauvaise surprise. Choisissez le
            montant adapté à vos besoins et lancez votre demande en quelques clics.
          </p>
        </div>

        <div className="mt-14 grid items-stretch gap-8 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
          <EssentialProductCard />
          <GrowthProductCard />
        </div>
      </div>
    </section>
  );
}

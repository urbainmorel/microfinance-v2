import { ArrowRight, Award, Banknote, CheckCircle, ShieldCheck, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function FeatureCardsGrid() {
  return (
    <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <div className="group rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:border-accent/40 hover:shadow-card">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent transition group-hover:scale-110">
          <Banknote className="size-6" />
        </div>
        <h3 className="mt-5 font-display text-xl font-bold text-foreground">
          Dépôt de garantie protégé
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Seulement 5% à 10% de garantie selon l’offre choisie. Votre dépôt reste votre propriété,
          bloqué sur un compte de cantonnement et restitué dès l’achèvement du prêt.
        </p>
      </div>

      <div className="group rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:border-accent/40 hover:shadow-card">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent transition group-hover:scale-110">
          <ShieldCheck className="size-6" />
        </div>
        <h3 className="mt-5 font-display text-xl font-bold text-foreground">
          Sécurité bancaire & Code PIN
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Chaque opération sensible, décaissement ou confirmation de contrat est verrouillée par
          votre code PIN confidentiel et un protocole de chiffrement éprouvé.
        </p>
      </div>

      <div className="group rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:border-accent/40 hover:shadow-card">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent transition group-hover:scale-110">
          <Smartphone className="size-6" />
        </div>
        <h3 className="mt-5 font-display text-xl font-bold text-foreground">
          Gestion 100% en ligne
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Fini les files d’attente au guichet. Soumettez vos justificatifs, suivez l’avancement en
          direct et pilotez vos échéances depuis votre tableau de bord.
        </p>
      </div>
    </div>
  );
}

function ExpansionShowcase() {
  return (
    <div className="mt-20 rounded-3xl border border-border bg-muted/30 p-8 sm:p-12 lg:mt-28 lg:p-16">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="relative lg:col-span-6">
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/landing/business-growth.jpg"
                alt="Chef d’entreprise dans son atelier moderne en pleine expansion"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center"
              />
            </div>
          </div>

          <div className="absolute -bottom-5 right-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-lg sm:right-8">
            <Award className="size-7 text-accent" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Impact Économique</p>
              <p className="font-display text-sm font-bold text-foreground">
                +2 500 projets financés
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start lg:col-span-6">
          <span className="rounded-full bg-finance-soft px-3 py-1 text-xs font-bold text-accent">
            Partenaire de votre expansion
          </span>
          <h3 className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl">
            Des prêts pensés pour créer de la valeur réelle
          </h3>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Que vous soyez commerçant indépendant, artisan ou dirigeant de PME en Afrique de
            l’Ouest, nous simplifions l’accès aux fonds pour financer votre croissance sans
            compromettre votre équilibre.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-sm text-foreground">
                <strong>Taux fixe garanti :</strong> Aucun frais surprise, mensualités connues à
                l’avance.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-sm text-foreground">
                <strong>Restitution totale du dépôt :</strong> Votre garantie vous revient à 100% au
                terme du remboursement.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-sm text-foreground">
                <strong>Service client réactif :</strong> Une équipe à votre écoute pour vous
                conseiller.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/auth/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-display text-sm font-bold text-accent-foreground shadow-md shadow-accent/25 transition hover:bg-finance-deep"
            >
              <span>Obtenir un prêt</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section id="avantages" className="overflow-hidden bg-background py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-finance-soft px-3 py-1 text-xs font-bold text-accent">
            Pourquoi nous faire confiance ?
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Une microfinance humaine, sécurisée et directe
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Nous combinons la solidité des standards bancaires de la zone UMOA avec une technologie
            rapide et accessible depuis votre mobile.
          </p>
        </div>

        <FeatureCardsGrid />
        <ExpansionShowcase />
      </div>
    </section>
  );
}

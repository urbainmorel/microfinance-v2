import { ArrowRight, Award, Banknote, CheckCircle, ShieldCheck, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function FeatureCardsGrid() {
  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition duration-200 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
        <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform group-hover:scale-105">
          <Banknote className="size-5" />
        </div>
        <h3 className="mt-5 font-display text-lg font-extrabold tracking-tight text-slate-900">
          Garantie protégée & restituée
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Seulement 5% à 10% de garantie selon le prêt. Le montant reste votre propriété sur compte
          de séquestre et vous est restitué intégralement dès le prêt soldé.
        </p>
      </div>

      <div className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition duration-200 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
        <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform group-hover:scale-105">
          <ShieldCheck className="size-5" />
        </div>
        <h3 className="mt-5 font-display text-lg font-extrabold tracking-tight text-slate-900">
          Sécurité bancaire & Code PIN
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Chaque décaissement, approbation d’échéancier et virement est protégé par votre code PIN
          chiffré selon les normes de sécurité bancaire UMOA.
        </p>
      </div>

      <div className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition duration-200 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
        <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform group-hover:scale-105">
          <Smartphone className="size-5" />
        </div>
        <h3 className="mt-5 font-display text-lg font-extrabold tracking-tight text-slate-900">
          Gestion 100% en ligne
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Fini les files d’attente. Effectuez vos remboursements par Mobile Money ou virement et
          suivez vos attestations directement sur votre tableau de bord.
        </p>
      </div>
    </div>
  );
}

function ExpansionVisual() {
  return (
    <div className="relative lg:col-span-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md">
        <div className="relative aspect-[4/3] w-full">
          <Image
            src="/images/landing/business-growth.webp"
            alt="Chef d’entreprise dans son atelier moderne en pleine expansion"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            loading="eager"
            decoding="async"
            className="object-cover object-center"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.08)] sm:absolute sm:-bottom-4 sm:right-6 sm:mt-0">
        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Award className="size-5" />
        </div>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Impact Réel
          </p>
          <p className="font-display text-sm font-extrabold text-slate-900">
            +2 500 projets financés
          </p>
        </div>
      </div>
    </div>
  );
}

function ExpansionContent() {
  return (
    <div className="flex flex-col items-start lg:col-span-6">
      <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-800">
        Partenaire de votre essor
      </span>
      <h3 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        Des crédits pensés pour créer de la valeur réelle
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
        Que vous soyez commerçant indépendant, artisan ou dirigeant de PME dans l’espace UEMOA, nous
        fluidifions l’accès au capital pour concrétiser vos ambitions sans lourdeur administrative.
      </p>

      <div className="mt-5 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <CheckCircle className="size-4.5 mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-xs text-slate-700 sm:text-sm">
            <strong className="text-slate-900">Taux fixe contractuel :</strong> Montants connus,
            aucun frais caché.
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <CheckCircle className="size-4.5 mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-xs text-slate-700 sm:text-sm">
            <strong className="text-slate-900">Restitution certifiée :</strong> Votre dépôt de
            garantie vous revient à 100%.
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <CheckCircle className="size-4.5 mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-xs text-slate-700 sm:text-sm">
            <strong className="text-slate-900">Accompagnement local :</strong> Une équipe dédiée
            joignable par téléphone et agence.
          </p>
        </div>
      </div>

      <div className="mt-7">
        <Link
          href="/auth/register"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 font-display text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-slate-800 active:translate-y-px"
        >
          <span>Déposer un dossier</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

function ExpansionShowcase() {
  return (
    <div className="mt-16 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.03)] sm:p-10 lg:mt-24 lg:p-14">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <ExpansionVisual />
        <ExpansionContent />
      </div>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section
      id="avantages"
      className="border-b border-slate-200/80 bg-slate-50/60 py-16 sm:py-20 lg:py-24"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Normes & Engagements
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Une microfinance solide, humaine et directe
          </h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Nous combinons la rigueur des exigences prudentielles de la zone UMOA avec une
            technologie d’accès simplifiée depuis votre smartphone.
          </p>
        </div>

        <FeatureCardsGrid />
        <ExpansionShowcase />
      </div>
    </section>
  );
}

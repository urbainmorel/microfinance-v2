import { ArrowRight, BadgePercent, Check, Clock, Shield } from "lucide-react";
import Link from "next/link";

function EssentialProductSpecs() {
  return (
    <>
      <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Montant accordé
        </p>
        <p className="mt-1 font-display text-2xl font-black text-slate-900">
          100 000 à 500 000 <span className="text-sm font-bold text-slate-500">FCFA</span>
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <BadgePercent className="size-4 text-slate-700" />
            <span>Taux annuel effectif</span>
          </div>
          <span className="font-display text-base font-extrabold text-slate-900">8,5%</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Shield className="size-4 text-slate-700" />
            <span>Dépôt de garantie</span>
          </div>
          <span className="font-display text-base font-extrabold text-slate-900">10%</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Clock className="size-4 text-slate-700" />
            <span>Durée de remboursement</span>
          </div>
          <span className="text-xs font-bold text-slate-900">6 à 12 mois</span>
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-xs font-medium text-slate-600">
        <li className="flex items-center gap-2">
          <Check className="size-4 shrink-0 text-emerald-600" />
          <span>Validation express sous 24h ouvrées</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="size-4 shrink-0 text-emerald-600" />
          <span>Échéancier mensuel transparent</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="size-4 shrink-0 text-emerald-600" />
          <span>Garantie 100% restituée à terme</span>
        </li>
      </ul>
    </>
  );
}

function EssentialProductCard() {
  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:p-8">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Formule 1 • Court terme
          </span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Besoin rapide
          </span>
        </div>

        <h3 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-slate-900">
          Prêt Essentiel
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Conçu pour le fonds de roulement immédiat, réapprovisionnement de boutique et dépenses
          d’exploitation.
        </p>

        <EssentialProductSpecs />
      </div>

      <div className="mt-8 pt-2">
        <Link
          href="/auth/register?product=essential"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-display text-xs font-bold uppercase tracking-wider text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100"
        >
          <span>Choisir le Prêt Essentiel</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

function GrowthProductSpecs() {
  return (
    <>
      <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-800">
          Montant disponible
        </p>
        <p className="mt-1 font-display text-2xl font-black text-slate-900">
          1 000 000 à 5 000 000 <span className="text-sm font-bold text-slate-500">FCFA</span>
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <BadgePercent className="size-4 text-emerald-700" />
            <span>Taux annuel préférentiel</span>
          </div>
          <span className="font-display text-xl font-black text-emerald-700">5% / an</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Shield className="size-4 text-emerald-700" />
            <span>Dépôt de garantie allégé</span>
          </div>
          <span className="font-display text-base font-extrabold text-slate-900">5% seulement</span>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Clock className="size-4 text-emerald-700" />
            <span>Durée de remboursement</span>
          </div>
          <span className="text-xs font-bold text-slate-900">12 à 60 mois (1 à 5 ans)</span>
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-xs font-medium text-slate-600">
        <li className="flex items-center gap-2">
          <Check className="size-4 shrink-0 text-emerald-600" />
          <span>Taux ultra-compétitif de 5% l’an</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="size-4 shrink-0 text-emerald-600" />
          <span>Garantie minimale de 5% protégée sous séquestre</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="size-4 shrink-0 text-emerald-600" />
          <span>Conseiller financier dédié tout au long du prêt</span>
        </li>
      </ul>
    </>
  );
}

function GrowthProductCard() {
  return (
    <div className="relative flex flex-col justify-between rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(15,23,42,0.14)] sm:p-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="rounded-md bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-white">
          Formule 2 • Moyen terme
        </span>
        <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
          Taux le plus bas
        </span>
      </div>

      <div>
        <h3 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
          Prêt Croissance
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Conçu pour acquérir du matériel professionnel, aménager un local ou développer une PME.
        </p>

        <GrowthProductSpecs />
      </div>

      <div className="mt-8 pt-2">
        <Link
          href="/auth/register?product=growth"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 font-display text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-slate-800 active:translate-y-px"
        >
          <span>Choisir le Prêt Croissance</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function LandingProducts() {
  return (
    <section
      id="produits"
      className="border-b border-slate-200/80 bg-white py-16 sm:py-20 lg:py-24"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
            <span>Catalogue Financement</span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Deux solutions de crédit certifiées UMOA
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Barèmes transparents sans frais cachés. Vos fonds sont disponibles directement sur votre
            compte après vérification.
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-2 lg:mx-auto lg:max-w-4xl lg:gap-8">
          <EssentialProductCard />
          <GrowthProductCard />
        </div>
      </div>
    </section>
  );
}

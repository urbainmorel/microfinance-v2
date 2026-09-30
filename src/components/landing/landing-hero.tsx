import { ArrowRight, CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function HeroContent() {
  return (
    <div className="flex flex-col items-start lg:col-span-7">
      {/* Badge technique de haute précision */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <span className="size-2 rounded-full bg-emerald-600" />
        <span className="font-mono text-xs font-semibold tracking-wide text-slate-800">
          Financement UMOA 100% digital & sécurisé
        </span>
      </div>

      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.1]">
        Des prêts flexibles pour accélérer vos projets.
      </h1>

      <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
        Accédez à un crédit d’entreprise ou de trésorerie clair et transparent à partir de{" "}
        <strong className="font-semibold text-slate-900">5% par an</strong>. Déblocage direct après
        dépôt de garantie protégé et restitué à l’échéance.
      </p>

      {/* Checklist de rassurance nette */}
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 sm:text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span>Taux dès 5% / an</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span>Garantie dès 5% restituée</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span>Décision sous 24h à 48h</span>
        </div>
      </div>

      {/* CTAs Tactiles Solides */}
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        <Link
          href="/auth/register"
          className="h-13 inline-flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 px-8 font-display text-sm font-bold uppercase tracking-wider text-white shadow-[0_4px_12px_rgba(15,23,42,0.18)] transition-all hover:bg-slate-800 active:translate-y-px"
        >
          <span>Simuler & Obtenir un prêt</span>
          <ArrowRight className="size-4" />
        </Link>

        <Link
          href="/auth/login"
          className="h-13 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-7 font-display text-sm font-bold uppercase tracking-wider text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300 hover:bg-slate-50"
        >
          Espace client
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-2.5 text-xs font-medium text-slate-500">
        <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
        <span>Données chiffrées • Compte de cantonnement sécurisé conforme UMOA</span>
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mt-8 lg:col-span-5 lg:mt-0">
      <div className="relative mx-auto max-w-md lg:max-w-none">
        {/* Cadre photo solide avec fine bordure technique */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
            <Image
              src="/images/landing/hero-entrepreneur.webp"
              alt="Entrepreneure gérant son financement dans son commerce"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
              priority
              className="hover:scale-103 object-cover object-center transition duration-500"
            />
          </div>

          {/* Badge Taux d'angle solide intégré dans le cadre */}
          <div className="absolute right-5 top-5 rounded-lg border border-slate-900/10 bg-slate-900 px-3.5 py-1.5 text-white shadow-md">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300">
              Taux préférentiel
            </p>
            <p className="font-display text-base font-black leading-none text-emerald-400">
              Dès 5% / an
            </p>
          </div>
        </div>

        {/* Badge Flottant Solide (Pas de glassmorphism, positionnement sécurisé sans débordement) */}
        <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)] sm:-left-6 sm:right-auto">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Déblocage Express
            </p>
            <p className="font-display text-base font-extrabold text-slate-900">
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
    <section className="lg:pt-18 relative overflow-hidden border-b border-slate-200/80 bg-slate-50/70 pb-20 pt-10 sm:pb-24 sm:pt-14 lg:pb-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <HeroContent />
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

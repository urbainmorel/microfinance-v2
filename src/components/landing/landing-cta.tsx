import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function LandingCta() {
  return (
    <section className="bg-slate-50/60 py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 text-center text-white shadow-2xl sm:p-14 lg:p-20">
          <div className="relative z-10 mx-auto max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span>Dossier en ligne en 5 minutes</span>
            </div>

            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Prêt à concrétiser votre financement ?
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
              Rejoignez les milliers d’artisans, commerçants et dirigeants de PME qui nous font
              confiance. Obtenez une décision rapide avec des conditions garanties.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/auth/register"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-7 font-display text-xs font-bold uppercase tracking-wider text-slate-950 shadow-md transition hover:bg-slate-100 active:translate-y-px sm:w-auto"
              >
                <span>Faire une demande immédiate</span>
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/auth/login"
                className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-7 font-display text-xs font-bold uppercase tracking-wider text-white transition hover:bg-slate-800 sm:w-auto"
              >
                Déjà client ? Se connecter
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
              <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
              <span>Agrément UMOA • Dépôt sous séquestre restitué à 100% • Zéro frais caché</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

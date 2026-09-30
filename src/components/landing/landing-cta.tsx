import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function LandingCta() {
  return (
    <section className="bg-background py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="to-accent-ink relative overflow-hidden rounded-3xl bg-gradient-to-r from-accent via-finance-deep p-8 text-center text-accent-foreground shadow-2xl sm:p-14 lg:p-20">
          <div className="relative z-10 mx-auto max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold text-white">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span>Votre demande en ligne en moins de 5 minutes</span>
            </div>

            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Prêt à concrétiser votre projet financier ?
            </h2>

            <p className="mt-4 text-base text-white/80 sm:text-lg">
              Rejoignez des milliers d’entrepreneurs et de particuliers qui nous font confiance.
              Choisissez votre formule et obtenez une décision rapide.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/register"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-white px-8 font-display text-base font-bold text-accent shadow-xl transition hover:bg-white/90 active:translate-y-px sm:w-auto"
              >
                <span>Obtenir un prêt maintenant</span>
                <ArrowRight className="size-5" />
              </Link>
              <Link
                href="/auth/login"
                className="flex h-14 w-full items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 font-display text-base font-bold text-white transition hover:bg-white/20 sm:w-auto"
              >
                Déjà client ? Se connecter
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/80">
              <ShieldCheck className="size-4 shrink-0 text-white" />
              <span>
                Agrément microfinance UMOA • Dépôt restitué à 100% à l’échéance • Aucun frais caché
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

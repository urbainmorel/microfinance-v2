import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

export function LandingCta() {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="to-accent-ink relative overflow-hidden rounded-3xl bg-gradient-to-r from-accent via-finance-deep p-8 text-center text-accent-foreground shadow-2xl sm:p-14 lg:p-20">
          {/* Motifs décoratifs d'arrière-plan */}
          <div
            className="pointer-events-none absolute right-0 top-0 size-96 -translate-y-12 translate-x-12 rounded-full bg-white/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 size-96 -translate-x-12 translate-y-12 rounded-full bg-white/5 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Clock className="size-3.5" />
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
                className="flex h-14 w-full items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 font-display text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/20 sm:w-auto"
              >
                Déjà client ? Se connecter
              </Link>
            </div>

            <p className="mt-6 text-xs text-white/70">
              Agrément microfinance UMOA • Dépôt de garantie restitué à 100% à l’échéance • Aucun
              frais caché
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

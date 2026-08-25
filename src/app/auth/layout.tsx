import { ArrowUpRight, Landmark, LockKeyhole, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-card lg:grid-cols-[minmax(0,1fr)_minmax(500px,0.78fr)]">
      <section className="relative hidden overflow-hidden border-r border-border bg-card p-12 lg:flex lg:flex-col xl:p-16">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-accent text-white">
            <Landmark className="size-5" strokeWidth={1.8} aria-hidden />
          </span>
          <div>
            <p className="font-display text-lg font-bold tracking-tight">Microfinance</p>
            <p className="text-xs font-medium text-muted-foreground">Votre espace financier</p>
          </div>
        </div>

        <div className="my-auto max-w-xl py-16">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-finance-soft px-3 py-1.5 text-xs font-bold text-accent">
            <ShieldCheck className="size-3.5" aria-hidden /> Finance sécurisée et transparente
          </p>
          <h2 className="font-display text-5xl font-bold leading-[1.08] tracking-[-0.045em] text-foreground xl:text-6xl">
            Gérez votre argent avec plus de clarté.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
            Épargne, financement et opérations réunis dans une expérience simple, moderne et pensée
            pour vous.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <LockKeyhole className="size-5 text-accent" aria-hidden />
            <p className="mt-4 text-sm font-bold">Accès protégé</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Vos opérations sensibles sont confirmées par votre PIN.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <ArrowUpRight className="size-5 text-accent" aria-hidden />
            <p className="mt-4 text-sm font-bold">Suivi en temps réel</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Retrouvez chaque demande et son statut au même endroit.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center bg-background px-5 py-10 sm:px-8">
        <div className="w-full max-w-[460px]">{children}</div>
      </section>
    </main>
  );
}

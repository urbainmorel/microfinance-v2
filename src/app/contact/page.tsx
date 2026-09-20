import { ArrowLeft, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import Link from "next/link";

import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contactez-nous — Azari Microfinance",
  description:
    "Prenez contact avec notre équipe pour toute question sur nos offres de crédit ou le suivi de votre compte.",
};

function ContactCards() {
  return (
    <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-3">
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Phone className="size-6" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-foreground">Téléphone</h3>
        <p className="mt-1 text-xs text-muted-foreground">Du lundi au vendredi de 8h à 18h</p>
        <p className="mt-4 font-display text-base font-bold text-accent">+225 27 20 00 00 00</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Mail className="size-6" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-foreground">
          Courrier électronique
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">Réponse moyenne en 24h ouvrées</p>
        <p className="mt-4 font-display text-sm font-bold text-accent">
          contact@azari-microfinance.org
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <MapPin className="size-6" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-foreground">
          Siège institutionnel
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">Zone financière UMOA</p>
        <p className="mt-4 text-xs font-semibold text-foreground">
          Plateau, Abidjan — Côte d’Ivoire
        </p>
      </div>
    </div>
  );
}

function ClientSpaceBanner() {
  return (
    <div className="mx-auto mt-14 max-w-xl rounded-2xl border border-border/80 bg-muted/40 p-6 text-center">
      <MessageSquare className="mx-auto mb-2 size-6 text-accent" />
      <p className="font-display text-base font-bold text-foreground">
        Vous avez déjà une demande en cours ?
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Connectez-vous directement à votre espace client pour consulter l’avancement ou échanger
        avec votre agent dédié.
      </p>
      <div className="mt-4">
        <Link
          href="/auth/login"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-foreground px-5 text-xs font-bold text-card transition hover:bg-foreground/90"
        >
          Accéder à l’espace client
        </Link>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingHeader />

      <main className="flex-1 py-14 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-accent hover:underline"
            >
              <ArrowLeft className="size-3.5" /> Retour à l’accueil
            </Link>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Contactez notre équipe
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Nos conseillers sont à votre disposition pour vous accompagner dans vos démarches de
              prêt ou répondre à vos questions.
            </p>
          </div>

          <ContactCards />
          <ClientSpaceBanner />
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

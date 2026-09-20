import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingProducts } from "@/components/landing/landing-products";
import { LandingTestimonials } from "@/components/landing/landing-testimonials";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Azari Microfinance — Solutions de crédit rapides et transparentes",
  description:
    "Financez vos projets avec nos prêts transparents de 100 000 à 5 000 000 FCFA. Taux avantageux dès 5% par an et dépôt de garantie sécurisé de 5% à 10%.",
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-accent/20 selection:text-foreground">
      {/* Barre de navigation */}
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section avec 1ère photo photoréaliste et CTA */}
        <LandingHero />

        {/* Section Présentation Succincte des 2 Produits */}
        <LandingProducts />

        {/* Avantages & 2ème photo photoréaliste */}
        <LandingFeatures />

        {/* Section Avis et Témoignages */}
        <LandingTestimonials />

        {/* Appel à l'action final */}
        <LandingCta />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}

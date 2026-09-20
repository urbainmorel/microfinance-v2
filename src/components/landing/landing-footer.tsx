import { Landmark, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { PlatformName } from "@/components/brand/platform-name";

function FooterLinks() {
  return (
    <>
      <div>
        <h4 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          Nos Formules de Prêt
        </h4>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li>
            <Link href="#produits" className="transition hover:text-accent">
              Prêt Essentiel
            </Link>
          </li>
          <li>
            <Link href="#produits" className="transition hover:text-accent">
              Prêt Croissance
            </Link>
          </li>
          <li>
            <Link
              href="/auth/register"
              className="font-semibold text-accent transition hover:underline"
            >
              Demande de prêt en ligne →
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <h4 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          Informations & Contact
        </h4>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li>
            <Link href="/contact" className="transition hover:text-accent">
              Contactez-nous
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="transition hover:text-accent">
              Politique de confidentialité
            </Link>
          </li>
          <li>
            <span className="cursor-not-allowed text-muted-foreground/60">
              Mentions légales (bientôt disponible)
            </span>
          </li>
          <li>
            <Link href="/auth/login" className="transition hover:text-accent">
              Espace client sécurisé
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}

function FooterBrand() {
  return (
    <div className="lg:col-span-2">
      <Link href="/" className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
          <Landmark className="size-5" />
        </span>
        <PlatformName
          fallback="Azari Microfinance"
          className="font-display text-xl font-bold tracking-tight text-foreground"
        />
      </Link>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        Institution de microfinance régie par la réglementation UMOA. Nous proposons des solutions
        de crédit inclusives, transparentes et équitables avec des taux à partir de 5% par an et un
        dépôt de garantie strictement garanti.
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-accent">
        <ShieldCheck className="size-4" />
        <span>Conforme aux normes de régulation financière UMOA</span>
      </div>
    </div>
  );
}

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card text-foreground">
      <div className="container mx-auto px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <FooterBrand />
          <FooterLinks />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            © {currentYear} <PlatformName fallback="Azari Microfinance" />. Tous droits réservés.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground">
              Confidentialité
            </Link>
            <Link href="/contact" className="hover:text-foreground">
              Support & Assistance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

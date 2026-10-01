import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BrandLogoFull } from "@/components/brand/brand-symbol";
import { PlatformName } from "@/components/brand/platform-name";

function FooterLinks() {
  return (
    <>
      <div>
        <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white">
          Nos Formules de Prêt
        </h4>
        <ul className="mt-4 space-y-2.5 text-sm text-white/70">
          <li>
            <Link href="#produits" className="transition hover:text-white">
              Prêt Essentiel (Court terme)
            </Link>
          </li>
          <li>
            <Link href="#produits" className="transition hover:text-white">
              Prêt Croissance (Moyen terme)
            </Link>
          </li>
          <li>
            <Link
              href="/auth/register"
              className="font-semibold text-sky-400 transition hover:text-sky-300 hover:underline"
            >
              Demande de prêt en ligne →
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white">
          Informations & Contact
        </h4>
        <ul className="mt-4 space-y-2.5 text-sm text-white/70">
          <li>
            <Link href="/contact" className="transition hover:text-white">
              Contactez-nous & Agences
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="transition hover:text-white">
              Politique de confidentialité
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="transition hover:text-white">
              Conformité réglementaire UMOA
            </Link>
          </li>
          <li>
            <Link href="/auth/login" className="transition hover:text-white">
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
      <Link href="/" className="inline-flex items-center" aria-label="Accueil Azari Microfinance">
        <BrandLogoFull className="h-10 w-auto object-contain" />
      </Link>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
        Institution de microfinance régie par la réglementation UMOA. Nous proposons des solutions
        de crédit inclusives, transparentes et équitables avec des taux à partir de 5% par an et un
        dépôt de garantie strictement garanti.
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-sky-300">
        <ShieldCheck className="size-4" />
        <span>Conforme aux normes de régulation financière UMOA</span>
      </div>
    </div>
  );
}

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-finance-ink text-white">
      <div className="container mx-auto px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <FooterBrand />
          <FooterLinks />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-center text-xs text-white/60 sm:flex-row sm:text-left">
          <p>
            © {currentYear} <PlatformName fallback="Azari Microfinance" />. Tous droits réservés.
          </p>
          <div className="flex gap-6 font-medium">
            <Link href="/privacy" className="text-white/70 transition hover:text-white">
              Confidentialité
            </Link>
            <Link href="/contact" className="text-white/70 transition hover:text-white">
              Support & Assistance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

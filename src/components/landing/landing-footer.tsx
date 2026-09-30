import { Landmark, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { PlatformName } from "@/components/brand/platform-name";

function FooterLinks() {
  return (
    <>
      <div>
        <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
          Formules de Prêt
        </h4>
        <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
          <li>
            <Link href="#produits" className="transition hover:text-slate-900">
              Prêt Essentiel (Court terme)
            </Link>
          </li>
          <li>
            <Link href="#produits" className="transition hover:text-slate-900">
              Prêt Croissance (Moyen terme)
            </Link>
          </li>
          <li>
            <Link
              href="/auth/register"
              className="font-bold text-slate-900 transition hover:underline"
            >
              Demande de prêt en ligne →
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
          Conformité & Contact
        </h4>
        <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
          <li>
            <Link href="/contact" className="transition hover:text-slate-900">
              Assistance & Agences
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="transition hover:text-slate-900">
              Protection des données & Sécurité
            </Link>
          </li>
          <li>
            <Link href="/privacy" className="transition hover:text-slate-900">
              Conditions réglementaires UMOA
            </Link>
          </li>
          <li>
            <Link href="/auth/login" className="transition hover:text-slate-900">
              Accès espace client sécurisé
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
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
          <Landmark className="size-4.5" />
        </span>
        <PlatformName
          fallback="Azari Microfinance"
          className="font-display text-lg font-extrabold tracking-tight text-slate-900"
        />
      </Link>
      <p className="mt-3.5 max-w-md text-xs leading-relaxed text-slate-600">
        Établissement de microfinance soumis aux normes prudentielles de l’UMOA. Financements
        responsables avec taux annuels dès 5% et garantie séquestrée restituée dès le terme du
        contrat.
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
        <ShieldCheck className="size-4" />
        <span>Conforme aux normes financières de la Banque Centrale (BCEAO / UMOA)</span>
      </div>
    </div>
  );
}

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-900">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <FooterBrand />
          <FooterLinks />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>
            © {currentYear} <PlatformName fallback="Azari Microfinance" />. Tous droits réservés.
          </p>
          <div className="flex gap-6 font-medium">
            <Link href="/privacy" className="hover:text-slate-900">
              Confidentialité
            </Link>
            <Link href="/contact" className="hover:text-slate-900">
              Support Client
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

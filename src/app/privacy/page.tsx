import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 py-12 text-foreground">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Version privacy-v1</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Politique de confidentialité</h1>
      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <p>
          Nous collectons les informations nécessaires à l’ouverture du compte, à la vérification
          d’identité, à l’étude des prêts et au traitement des opérations financières.
        </p>
        <p>
          Les pièces KYC et justificatifs sont conservés dans des espaces privés. Leur accès est
          limité au client concerné et au personnel autorisé. Les actions sensibles sont auditées.
        </p>
        <p>
          Vous pouvez demander l’accès, la correction ou l’effacement des données qui ne sont pas
          soumises à une obligation légale de conservation. Une demande peut être adressée au
          responsable de la microfinance depuis votre espace client.
        </p>
        <p>
          Les durées définitives de conservation et les coordonnées du responsable de traitement
          doivent être validées par l’institution avant l’ouverture au public.
        </p>
      </div>
      <Link
        href="/auth/register"
        className="mt-10 inline-flex min-h-11 items-center font-semibold text-accent"
      >
        Retour à l’inscription
      </Link>
    </main>
  );
}

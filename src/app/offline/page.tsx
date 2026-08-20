import { WifiOff } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center px-5">
      <Card className="w-full space-y-4 text-center">
        <WifiOff className="mx-auto size-10 text-accent" aria-hidden />
        <h1 className="font-display text-2xl font-bold">Connexion indisponible</h1>
        <p className="text-sm text-muted-foreground">
          Aucune donnée financière n’est conservée hors ligne. Rétablissez votre connexion pour
          accéder à votre espace sécurisé.
        </p>
        <Link href="/" className={buttonVariants({ variant: "accent" })}>
          Réessayer
        </Link>
      </Card>
    </main>
  );
}

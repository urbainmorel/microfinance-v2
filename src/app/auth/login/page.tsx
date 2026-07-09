import { Landmark } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div className="rounded-[24px] border border-border bg-card p-7 shadow-card">
      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-[18px] bg-hero-green text-white shadow-hero">
          <Landmark className="size-7" strokeWidth={1.6} aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight text-foreground">
            Espace client
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez-vous pour accéder à vos opérations.
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
            Adresse email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="vous@exemple.com"
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
            Mot de passe
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="mt-2 w-full">
          Se connecter
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        <Link href="/auth/forgot-password" className="font-medium text-accent hover:underline">
          Mot de passe oublié ?
        </Link>
        <p className="text-muted-foreground">
          Nouveau client ?{" "}
          <Link href="/auth/register" className="font-semibold text-accent hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

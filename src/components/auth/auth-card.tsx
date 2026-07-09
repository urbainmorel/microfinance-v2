import { Landmark } from "lucide-react";
import * as React from "react";

/** Carte d'authentification partagée (marque + titre + sous-titre), DESIGN §8, §11. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-border bg-card p-7 shadow-card">
      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-[18px] bg-hero-green text-white shadow-hero">
          <Landmark className="size-7" strokeWidth={1.6} aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

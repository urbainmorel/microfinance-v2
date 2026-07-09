import * as React from "react";

import { cn } from "@/lib/utils";

/** Carte de contenu standard (DESIGN §7) : coins arrondis, bord discret, ombre légère. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card p-5 shadow-card", className)}
      {...props}
    />
  );
}

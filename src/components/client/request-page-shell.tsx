import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";

import type { ReactNode } from "react";

export function RequestPageShell({
  title,
  description,
  backHref,
  children,
}: {
  title: string;
  description: string;
  backHref: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={backHref}
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent"
        >
          <ArrowLeft aria-hidden /> Retour
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function RequestSuccess({ title, reference }: { title: string; reference: string }) {
  return (
    <Card role="status" aria-live="polite" className="text-center">
      <CheckCircle2 className="mx-auto size-9 text-accent" strokeWidth={1.8} aria-hidden />
      <p className="mt-3 font-display text-lg font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Référence : <span className="font-semibold text-foreground">{reference}</span>
      </p>
      <Link
        href="/client/operations"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
      >
        Suivre dans mes opérations
      </Link>
    </Card>
  );
}

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

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
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} backHref={backHref} />
      {children}
    </div>
  );
}

export function RequestSuccess({
  title,
  reference,
  href = "/client/operations",
  linkLabel = "Suivre dans mes opérations",
}: {
  title: string;
  reference: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <Card role="status" aria-live="polite" className="px-6 py-10 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-finance-soft text-accent">
        <CheckCircle2 className="size-6" strokeWidth={1.9} aria-hidden />
      </span>
      <p className="mt-4 font-display text-xl font-bold text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Référence : <span className="font-semibold text-foreground">{reference}</span>
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
      >
        {linkLabel}
      </Link>
    </Card>
  );
}

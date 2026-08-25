import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  backHref,
  backLabel = "Retour",
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-4 inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden /> {backLabel}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[28px] font-bold tracking-[-0.035em] text-foreground sm:text-[32px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

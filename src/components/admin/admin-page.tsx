import { AlertCircle, Inbox } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function AdminLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-label="Chargement">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-5 h-11 w-40 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function AdminError({ message }: { message: string }) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Données indisponibles"
      hint={message || "Réessayez dans un instant."}
    />
  );
}

export function AdminEmpty({ label }: { label: string }) {
  return (
    <EmptyState icon={Inbox} title={label} hint="Aucun élément ne nécessite votre attention." />
  );
}

export function MutationFeedback({ error, success }: { error: Error | null; success: boolean }) {
  if (error) {
    return (
      <p role="alert" className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
        {error.message}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm text-foreground">
        Action enregistrée.
      </p>
    );
  }
  return null;
}

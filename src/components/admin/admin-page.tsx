import { AlertCircle, AlertTriangle, CircleCheck, Inbox } from "lucide-react";

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
    <header className="mb-6 flex flex-col gap-4 border-b border-separator pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0 sm:pb-0.5">{action}</div> : null}
    </header>
  );
}

export function AdminLoading() {
  return (
    <div className="grid gap-3 lg:grid-cols-2" aria-label="Chargement">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
          <Skeleton className="mt-5 h-10 w-36" />
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
      <p
        role="alert"
        className="mt-3 flex items-start gap-2 rounded-xl border border-pastel-gold bg-pastel-gold px-3 py-2.5 text-sm text-foreground"
      >
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-warning"
          strokeWidth={1.8}
          aria-hidden
        />
        <span>{error.message}</span>
      </p>
    );
  }
  if (success) {
    return (
      <p
        role="status"
        className="mt-3 flex items-center gap-2 rounded-xl border border-secondary bg-secondary px-3 py-2.5 text-sm font-medium text-foreground"
      >
        <CircleCheck className="size-4 shrink-0 text-success" strokeWidth={1.8} aria-hidden />
        <span>Action enregistrée.</span>
      </p>
    );
  }
  return null;
}

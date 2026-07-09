import { cn } from "@/lib/utils";

/** Bloc de chargement (DESIGN §15) — pulsation neutre, jamais de spinner anxiogène. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />;
}

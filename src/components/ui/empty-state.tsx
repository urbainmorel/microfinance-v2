import { type LucideIcon } from "lucide-react";

/** État vide (DESIGN §15) : icône contour + titre + indication, dans une carte pointillée. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <Icon className="size-8 text-muted-foreground" strokeWidth={1.6} aria-hidden />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

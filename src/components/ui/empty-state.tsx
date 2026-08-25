import { type LucideIcon } from "lucide-react";

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
    <div className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-input bg-card px-6 py-11 text-center shadow-card">
      <span className="mb-1 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" strokeWidth={1.7} aria-hidden />
      </span>
      <p className="text-sm font-bold text-foreground">{title}</p>
      {hint ? <p className="max-w-sm text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function QueueCard({
  title,
  subtitle,
  status,
  facts,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  status: React.ReactNode;
  facts: Array<{ label: string; value: React.ReactNode }>;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <div className="flex flex-col gap-3 border-b border-separator p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {status}
      </div>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 p-5 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {fact.label}
            </dt>
            <dd className="mt-1 break-words text-sm font-medium text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {children ? (
        <div className="border-t border-separator bg-muted/35 p-4 sm:p-5">{children}</div>
      ) : null}
    </Card>
  );
}

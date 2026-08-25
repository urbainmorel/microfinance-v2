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
      <div className="flex flex-col gap-3 border-b border-separator px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words font-display text-base font-bold leading-6 text-foreground">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="shrink-0 self-start">{status}</div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 px-4 py-4 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0 border-l-2 border-separator pl-3">
            <dt className="text-[11px] font-semibold leading-4 text-muted-foreground">
              {fact.label}
            </dt>
            <dd className="mt-1 break-words text-[13px] font-semibold leading-5 text-foreground">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      {children ? (
        <div className="border-t border-separator bg-background p-4">{children}</div>
      ) : null}
    </Card>
  );
}

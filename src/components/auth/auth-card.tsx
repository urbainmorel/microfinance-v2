import { Landmark } from "lucide-react";
import * as React from "react";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-foreground/[0.07] bg-card p-6 shadow-lift sm:p-8">
      <div className="mb-8">
        <span className="mb-6 flex size-11 items-center justify-center rounded-xl bg-finance-soft text-accent lg:hidden">
          <Landmark className="size-5" strokeWidth={1.8} aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-[30px] font-bold tracking-[-0.03em] text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

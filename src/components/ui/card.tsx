import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-foreground/[0.065] bg-card p-5 shadow-card",
        className,
      )}
      {...props}
    />
  );
}

"use client";

import { usePlatformName } from "@/lib/hooks/use-platform-name";

export function PlatformName({
  fallback = "Azari Microfinance",
  className,
}: {
  fallback?: string;
  className?: string;
}) {
  const name = usePlatformName();
  return <span className={className}>{name || fallback}</span>;
}

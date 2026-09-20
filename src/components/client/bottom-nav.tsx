"use client";

import {
  HandCoins,
  History,
  Home,
  Landmark,
  LockKeyhole,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PlatformName } from "@/components/brand/platform-name";
import { useClientLocale } from "@/components/i18n/client-locale-provider";
import { cn } from "@/lib/utils";

const TABS: {
  href: string;
  label: "nav.home" | "nav.loans" | "nav.operations" | "nav.profile";
  icon: LucideIcon;
}[] = [
  { href: "/client/dashboard", label: "nav.home", icon: Home },
  { href: "/client/loans", label: "nav.loans", icon: HandCoins },
  { href: "/client/operations", label: "nav.operations", icon: History },
  { href: "/client/profile", label: "nav.profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useClientLocale();
  const isKyc = pathname.startsWith("/client/kyc");

  return (
    <nav
      className={cn(
        "border-t border-border bg-card lg:sticky lg:inset-auto lg:top-6 lg:flex lg:h-[calc(100dvh-3rem)] lg:flex-col lg:rounded-[22px] lg:border lg:p-3 lg:shadow-card",
        isKyc ? "hidden lg:flex" : "fixed inset-x-0 bottom-0 z-40",
      )}
    >
      <div className="hidden items-center gap-3 px-2 py-3 lg:flex">
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-white">
          <Landmark className="size-[18px]" strokeWidth={1.9} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-bold tracking-tight">
            <PlatformName fallback="Azari Microfinance" />
          </p>
          <p className="text-[11px] font-medium text-muted-foreground">Espace client</p>
        </div>
      </div>

      <div className="mx-2 my-3 hidden h-px bg-separator lg:block" />

      <ul className="mx-auto flex max-w-[560px] items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] lg:mx-0 lg:flex-col lg:gap-1 lg:p-0">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[58px] flex-col items-center justify-center gap-1 pt-2 text-[10px] font-semibold transition-colors lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:pt-0 lg:text-[13px]",
                  active
                    ? "text-accent lg:bg-finance-soft"
                    : "text-muted-foreground hover:text-foreground lg:hover:bg-muted/70",
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {t(label)}
                <span
                  className={cn(
                    "h-1 w-1 rounded-full lg:ml-auto lg:size-1.5",
                    active ? "bg-accent" : "bg-transparent",
                  )}
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto hidden rounded-2xl bg-muted/75 p-3 lg:block">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <LockKeyhole className="size-3.5 text-accent" aria-hidden /> Espace sécurisé
        </div>
        <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
          Vos données et opérations restent protégées.
        </p>
      </div>
    </nav>
  );
}

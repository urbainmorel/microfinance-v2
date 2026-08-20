"use client";

import { HandCoins, Home, Receipt, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useClientLocale } from "@/components/i18n/client-locale-provider";
import { cn } from "@/lib/utils";

const TABS: {
  href: string;
  label: "nav.home" | "nav.loans" | "nav.operations" | "nav.profile";
  icon: LucideIcon;
}[] = [
  { href: "/client/dashboard", label: "nav.home", icon: Home },
  { href: "/client/loans", label: "nav.loans", icon: HandCoins },
  { href: "/client/operations", label: "nav.operations", icon: Receipt },
  { href: "/client/profile", label: "nav.profile", icon: User },
];

/** Navigation basse — 4 onglets (PRD §7.6, DESIGN §12). Masquée pendant l'onboarding KYC. */
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useClientLocale();
  if (pathname.startsWith("/client/kyc")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white/95 backdrop-blur-md lg:sticky lg:inset-auto lg:top-6 lg:h-fit lg:rounded-2xl lg:border lg:bg-card lg:p-3 lg:shadow-card">
      <ul className="mx-auto flex max-w-[560px] items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] lg:flex-col lg:gap-1 lg:p-0">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 pt-2 text-[10px] font-semibold lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:pt-0 lg:text-sm",
                  active ? "text-accent" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {t(label)}
                <span
                  className={cn(
                    "h-1 w-1 rounded-full lg:ml-auto",
                    active ? "bg-accent" : "bg-transparent",
                  )}
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

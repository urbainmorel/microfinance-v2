"use client";

import { HandCoins, Home, Receipt, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/client/dashboard", label: "Accueil", icon: Home },
  { href: "/client/loans", label: "Mes prêts", icon: HandCoins },
  { href: "/client/operations", label: "Mes opérations", icon: Receipt },
  { href: "/client/profile", label: "Profil", icon: User },
];

/** Navigation basse — 4 onglets (PRD §7.6, DESIGN §12). Masquée pendant l'onboarding KYC. */
export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/client/kyc")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white/95 backdrop-blur-md">
      <ul className="mx-auto flex max-w-[560px] items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 pt-2 text-[10px] font-semibold",
                  active ? "text-accent" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {label}
                <span
                  className={cn("h-1 w-1 rounded-full", active ? "bg-accent" : "bg-transparent")}
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

"use client";

import {
  BadgeDollarSign,
  BarChart3,
  BookOpenCheck,
  ChevronLeft,
  ClipboardCheck,
  DatabaseZap,
  FileClock,
  HandCoins,
  LayoutDashboard,
  Mail,
  PackageOpen,
  ReceiptText,
  ShieldCheck,
  Settings,
  UserRoundCog,
} from "lucide-react";
import Link from "next/link";

import { formatRole } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

import { useAdminRole } from "./admin-role-context";

const navigation = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/kyc", label: "KYC", icon: ClipboardCheck },
  { href: "/admin/deposits", label: "Dépôts", icon: HandCoins },
  { href: "/admin/withdrawals", label: "Retraits", icon: BadgeDollarSign },
  { href: "/admin/repayments", label: "Remboursements", icon: ReceiptText },
  { href: "/admin/loans", label: "Prêts", icon: BookOpenCheck },
  { href: "/admin/products", label: "Produits", icon: PackageOpen },
  { href: "/admin/users", label: "Utilisateurs", icon: UserRoundCog },
  { href: "/admin/privacy", label: "Données", icon: DatabaseZap },
  { href: "/admin/audit", label: "Audit", icon: FileClock },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
  { href: "/admin/templates", label: "Notifications", icon: Mail },
  { href: "/admin/reports", label: "Rapports", icon: BarChart3 },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-5 pr-14 lg:pr-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground shadow-sm">
        <ShieldCheck className="size-[18px]" strokeWidth={1.9} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-[15px] font-bold text-foreground">Microfinance</p>
        <p className="truncate text-[11px] font-medium text-muted-foreground">
          Centre d’opérations
        </p>
      </div>
    </div>
  );
}

function SessionSummary() {
  const { role, isLoading } = useAdminRole();
  return (
    <div className="border-t border-border p-3">
      <div className="rounded-xl border border-border bg-muted px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Session
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {isLoading ? "Chargement…" : formatRole(role)}
        </p>
        {role === "admin" ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Responsable unique du back-office
          </p>
        ) : null}
      </div>
      <Link
        href="/"
        className="mt-2 flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.8} aria-hidden /> Retour à l’accueil
      </Link>
    </div>
  );
}

export function AdminNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <>
      <Brand />
      <nav
        className="scrollbar-subtle flex-1 space-y-1 overflow-y-auto px-3 py-4"
        aria-label="Navigation du back-office"
      >
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Navigation
        </p>
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-secondary text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-[17px] shrink-0" strokeWidth={active ? 2 : 1.7} aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
      <SessionSummary />
    </>
  );
}

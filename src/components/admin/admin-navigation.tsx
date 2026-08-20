"use client";

import {
  BadgeDollarSign,
  BookOpenCheck,
  ChevronLeft,
  ClipboardCheck,
  DatabaseZap,
  FileClock,
  HandCoins,
  LayoutDashboard,
  PackageOpen,
  ReceiptText,
  ShieldCheck,
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
];

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
      <div className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <ShieldCheck className="size-5" aria-hidden />
      </div>
      <div>
        <p className="font-display text-lg font-bold text-white">Microfinance</p>
        <p className="text-xs text-white/55">Centre d’opérations</p>
      </div>
    </div>
  );
}

function SessionSummary() {
  const { role, isLoading } = useAdminRole();
  return (
    <div className="border-t border-white/10 p-4">
      <div className="rounded-xl bg-white/10 px-3 py-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Session</p>
        <p className="mt-1 text-sm font-semibold text-white">
          {isLoading ? "Chargement…" : formatRole(role)}
        </p>
        {role === "admin" ? (
          <p className="mt-1 text-xs text-white/55">Responsable unique du back-office</p>
        ) : null}
      </div>
      <Link
        href="/"
        className="mt-3 flex items-center gap-2 px-2 text-xs font-medium text-white/60 hover:text-white"
      >
        <ChevronLeft className="size-3" aria-hidden /> Retour à l’accueil
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
        className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
        aria-label="Navigation du back-office"
      >
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-foreground shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          );
        })}
      </nav>
      <SessionSummary />
    </>
  );
}

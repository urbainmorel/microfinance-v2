"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AdminNavigation } from "@/components/admin/admin-navigation";

import { AdminRoleProvider } from "./admin-role-context";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoleProvider>
      <AdminShellFrame>{children}</AdminShellFrame>
    </AdminRoleProvider>
  );
}

function MobileNavigation({ pathname, close }: { pathname: string; close: () => void }) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-foreground"
        aria-label="Fermer le menu"
        onClick={close}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation du back-office"
        className="relative flex h-full w-[min(88vw,288px)] flex-col border-r border-border bg-card shadow-lift"
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Fermer la navigation"
        >
          <X className="size-5" strokeWidth={1.8} />
        </button>
        <AdminNavigation pathname={pathname} onNavigate={close} />
      </aside>
    </div>
  );
}

function AdminShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border bg-card lg:flex">
        <AdminNavigation pathname={pathname} onNavigate={() => setOpen(false)} />
      </aside>
      {open ? <MobileNavigation pathname={pathname} close={() => setOpen(false)} /> : null}
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted"
            aria-label="Ouvrir la navigation"
          >
            <Menu className="size-5" strokeWidth={1.8} />
          </button>
          <div className="text-center">
            <p className="font-display text-sm font-bold text-foreground">Back-office</p>
            <p className="text-[11px] font-medium text-muted-foreground">Centre d’opérations</p>
          </div>
          <div className="size-10" aria-hidden />
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

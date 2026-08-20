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
        className="absolute inset-0 bg-foreground/40"
        aria-label="Fermer le menu"
        onClick={close}
      />
      <aside className="relative flex h-full w-[min(84vw,300px)] flex-col bg-[hsl(var(--brand-green-deep))] shadow-2xl">
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full text-white/70 hover:bg-white/10"
          aria-label="Fermer la navigation"
        >
          <X className="size-5" />
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
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_right,hsl(var(--pastel-green)),transparent_34%),hsl(var(--background))]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[hsl(var(--brand-green-deep))] lg:flex">
        <AdminNavigation pathname={pathname} onNavigate={() => setOpen(false)} />
      </aside>
      {open ? <MobileNavigation pathname={pathname} close={() => setOpen(false)} /> : null}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-11 place-items-center rounded-xl border border-border bg-card"
            aria-label="Ouvrir la navigation"
          >
            <Menu className="size-5" />
          </button>
          <p className="font-display font-bold">Back-office</p>
          <div className="size-11" aria-hidden />
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}

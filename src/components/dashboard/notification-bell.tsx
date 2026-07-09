"use client";

import { Bell } from "lucide-react";
import Link from "next/link";

import { useNotifications } from "@/lib/hooks/use-notifications";

/** Cloche du header (DESIGN §11.7) : compteur de notifications non lues, lien vers la liste. */
export function NotificationBell() {
  const { data } = useNotifications();
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <Link
      href="/client/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} non lues` : "Notifications"}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-pill text-foreground hover:bg-muted"
    >
      <Bell className="size-5" strokeWidth={1.8} aria-hidden />
      {unread > 0 ? (
        <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-pill bg-accent px-1 text-[10px] font-bold text-accent-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

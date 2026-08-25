"use client";

import { BellOff } from "lucide-react";

import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkNotificationsRead, useNotifications } from "@/lib/hooks/use-notifications";

export default function NotificationsPage() {
  const { data, isPending } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const items = data ?? [];
  const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Les informations importantes liées à votre compte et vos demandes."
        action={
          unreadIds.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markRead.mutate(unreadIds)}
              disabled={markRead.isPending}
            >
              Tout marquer comme lu
            </Button>
          ) : undefined
        }
      />

      {isPending ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Aucune notification"
          hint="Vos alertes apparaîtront ici."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </ul>
      )}
    </div>
  );
}

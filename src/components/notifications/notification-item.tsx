import { formatDateTime } from "@/lib/date";
import { type NotificationRow } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";

/** Carte de notification (DESIGN §11.7) : non-lu = pastille accent + fond légèrement teinté. */
export function NotificationItem({ notification }: { notification: NotificationRow }) {
  const unread = !notification.read_at;
  return (
    <li
      className={cn(
        "flex gap-3 rounded-2xl border border-border p-4",
        unread ? "bg-pastel-green" : "bg-card",
      )}
    >
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          unread ? "bg-accent" : "bg-transparent",
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{notification.title}</p>
        {notification.body ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
        ) : null}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatDateTime(notification.created_at)}
        </p>
      </div>
    </li>
  );
}

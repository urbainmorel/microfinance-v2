"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";

/**
 * Client-only lazy loader for ChatbotWidget.
 * Hidden on /admin and /auth routes — visible on public pages and /client routes.
 */
export function ChatbotWidget() {
  const pathname = usePathname();
  const [Widget, setWidget] = useState<ComponentType | null>(null);

  const hidden = !pathname || pathname.startsWith("/admin") || pathname.startsWith("/auth");

  useEffect(() => {
    if (hidden) return;
    let mounted = true;
    import("./chatbot-widget")
      .then((mod) => {
        if (mounted) {
          setWidget(() => mod.ChatbotWidget);
        }
      })
      .catch((err) => {
        console.error("Failed to load ChatbotWidget:", err);
      });

    return () => {
      mounted = false;
    };
  }, [hidden]);

  if (hidden || !Widget) {
    return null;
  }

  return <Widget />;
}

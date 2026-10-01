"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * Client-only lazy loader for ChatbotWidget.
 * Avoids any SSR hydration mismatches and completely bypasses next/dynamic `{ ssr: false }`
 * Turbopack constraints in Next.js 16 App Router.
 */
export function ChatbotWidget() {
  const [Widget, setWidget] = useState<ComponentType | null>(null);

  useEffect(() => {
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
  }, []);

  if (!Widget) {
    return null;
  }

  return <Widget />;
}

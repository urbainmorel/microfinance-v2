"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { messages, type ClientLocale, type MessageKey } from "@/lib/i18n/messages";

type LocaleContextValue = {
  locale: ClientLocale;
  setLocale: (locale: ClientLocale) => void;
  t: (key: MessageKey) => string;
};
const LocaleContext = createContext<LocaleContextValue | null>(null);

function subscribeToLocale(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", callback);
  window.addEventListener("localechange", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("localechange", callback);
  };
}

function getClientLocaleSnapshot(): ClientLocale {
  if (typeof window === "undefined") return "fr";
  const stored = localStorage.getItem("mf_locale");
  return stored === "en" || stored === "fr" ? stored : "fr";
}

export function ClientLocaleProvider({
  children,
  initialLocale = "fr",
}: {
  children: React.ReactNode;
  initialLocale?: ClientLocale;
}) {
  const locale = useSyncExternalStore<ClientLocale>(
    subscribeToLocale,
    getClientLocaleSnapshot,
    () => initialLocale,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (next) => {
        localStorage.setItem("mf_locale", next);
        document.cookie = `mf_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
        window.dispatchEvent(new Event("localechange"));
      },
      t: (key) => messages[locale][key],
    }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useClientLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useClientLocale must be used inside ClientLocaleProvider");
  return context;
}

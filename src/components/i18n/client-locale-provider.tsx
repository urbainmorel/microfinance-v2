"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { messages, type ClientLocale, type MessageKey } from "@/lib/i18n/messages";

type LocaleContextValue = {
  locale: ClientLocale;
  setLocale: (locale: ClientLocale) => void;
  t: (key: MessageKey) => string;
};
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function ClientLocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: ClientLocale;
}) {
  const [locale, updateLocale] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (next) => {
        updateLocale(next);
        localStorage.setItem("mf_locale", next);
        document.cookie = `mf_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
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

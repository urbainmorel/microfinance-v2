"use client";

import { Languages } from "lucide-react";

import { useClientLocale } from "@/components/i18n/client-locale-provider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useClientLocale();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <Languages className="size-4 text-accent" aria-hidden />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as "fr" | "en")}
        aria-label={t("common.language")}
        className="h-11 rounded-xl border border-border bg-card px-3"
      >
        <option value="fr">{t("common.french")}</option>
        <option value="en">{t("common.english")}</option>
      </select>
    </label>
  );
}

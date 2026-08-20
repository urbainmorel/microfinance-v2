import { cookies } from "next/headers";

import { BottomNav } from "@/components/client/bottom-nav";
import { ClientLocaleProvider } from "@/components/i18n/client-locale-provider";

import type { ClientLocale } from "@/lib/i18n/messages";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const requested = (await cookies()).get("mf_locale")?.value;
  const locale: ClientLocale = requested === "en" ? "en" : "fr";
  return (
    <ClientLocaleProvider initialLocale={locale}>
      <div className="mx-auto min-h-dvh w-full max-w-screen-xl bg-radial-app px-5 pb-24 pt-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:pb-8">
        <BottomNav />
        <main className="min-w-0 lg:max-w-4xl">{children}</main>
      </div>
    </ClientLocaleProvider>
  );
}

import { cookies } from "next/headers";

import { BottomNav } from "@/components/client/bottom-nav";
import { ClientLocaleProvider } from "@/components/i18n/client-locale-provider";

import type { ClientLocale } from "@/lib/i18n/messages";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const requested = (await cookies()).get("mf_locale")?.value;
  const locale: ClientLocale = requested === "en" ? "en" : "fr";
  return (
    <ClientLocaleProvider initialLocale={locale}>
      <div className="mx-auto min-h-dvh w-full max-w-[560px] bg-radial-app px-5 pb-24 pt-6">
        {children}
        <BottomNav />
      </div>
    </ClientLocaleProvider>
  );
}

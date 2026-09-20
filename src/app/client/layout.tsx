import { BottomNav } from "@/components/client/bottom-nav";
import { ClientLocaleProvider } from "@/components/i18n/client-locale-provider";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientLocaleProvider>
      <div className="bg-app-bg min-h-dvh w-full px-4 pb-24 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pb-6 lg:pt-6 xl:gap-10 xl:px-8">
        <BottomNav />
        <main className="mx-auto w-full min-w-0 max-w-[1180px] lg:py-2">{children}</main>
      </div>
    </ClientLocaleProvider>
  );
}

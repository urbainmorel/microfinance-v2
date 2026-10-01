import { DM_Sans, Manrope } from "next/font/google";

import { ChatbotWidget } from "@/components/chatbot/chatbot-widget-client";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

import { Providers } from "./providers";

import type { Metadata, Viewport } from "next";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://azari-microfinance.site"),
  title: "Azari Microfinance — Espace client",
  description: "Portail de requêtes et de suivi : épargne, prêts et opérations.",
  applicationName: "Azari Microfinance",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Azari Microfinance" },
};

export const viewport: Viewport = {
  themeColor: "#F8FAFC",
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

const purgeNetlifyHudScript = `(function(){
  function removeHud(){
    var b = document.getElementById("nl-badge-frame") || document.getElementById("nl-hud-frame");
    if (b) b.remove();
    var s = document.querySelector("script[data-nf-variant]");
    if (s) { s.removeAttribute("data-nf-variant"); s.remove(); }
  }
  removeHud();
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver(removeHud).observe(document.documentElement, { childList: true, subtree: true });
  }
  window.addEventListener("DOMContentLoaded", removeHud);
  window.addEventListener("load", removeHud);
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${manrope.variable}`}>
      <body className="min-h-dvh">
        <script dangerouslySetInnerHTML={{ __html: purgeNetlifyHudScript }} />
        <Providers>
          {children}
          <ChatbotWidget />
        </Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

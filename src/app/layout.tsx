import { DM_Sans, Manrope } from "next/font/google";

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
  title: "Microfinance — Espace client",
  description: "Portail de requêtes et de suivi : épargne, prêts et opérations.",
  applicationName: "Microfinance UMOA",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Microfinance" },
};

export const viewport: Viewport = {
  themeColor: "#F8FAFC",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${manrope.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

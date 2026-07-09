import { Instrument_Sans, Sora } from "next/font/google";

import { Providers } from "./providers";

import type { Metadata, Viewport } from "next";

import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Microfinance — Espace client",
  description: "Portail de requêtes et de suivi : épargne, prêts et opérations.",
};

export const viewport: Viewport = {
  themeColor: "#0B2B1E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sora.variable} ${instrumentSans.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

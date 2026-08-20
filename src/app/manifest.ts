import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Microfinance UMOA",
    short_name: "Microfinance",
    description: "Espace sécurisé de gestion des demandes, prêts et remboursements en XOF.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F4EC",
    theme_color: "#0B2B1E",
    lang: "fr",
    categories: ["finance", "business"],
    icons: [
      { src: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/app-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

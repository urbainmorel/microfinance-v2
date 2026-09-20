import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Azari Microfinance",
    short_name: "Azari",
    description: "Espace sécurisé de gestion des demandes, prêts et remboursements en XOF.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#077BAD",
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

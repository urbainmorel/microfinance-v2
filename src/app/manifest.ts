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
      { src: "/icons/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icons/app-icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

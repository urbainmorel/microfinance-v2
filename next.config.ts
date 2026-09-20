import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Désactive la transformation serveur d'images pour préserver le quota gratuit Netlify
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

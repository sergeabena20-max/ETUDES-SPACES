import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Études Space",
    short_name: "Études Space",
    description: "Apprendre. S'entraîner. Réussir. La plateforme éducative camerounaise.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f4fbff",
    theme_color: "#0284c7",
    categories: ["education", "books"],
    lang: "fr-CM",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/etudes-space.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}

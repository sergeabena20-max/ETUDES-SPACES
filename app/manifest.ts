import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Etudes Spaces",
    short_name: "Etudes",
    description: "Apprendre. S'entraîner. Réussir. La plateforme éducative camerounaise.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#321078",
    theme_color: "#4b16a8",
    categories: ["education", "books"],
    lang: "fr-CM",
    icons: [
      {
        src: "/icons/etudes-space.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jourdain",
    short_name: "Jourdain",
    description: "Your personal AI operating system.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050410",
    theme_color: "#050410",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Full-bleed background with centred content — safe to mask.
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

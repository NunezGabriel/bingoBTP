import type { MetadataRoute } from "next";

/** Permite "Agregar a pantalla de inicio": abre como app, sin barra del navegador. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Misti Quest · GDG Arequipa",
    short_name: "Misti Quest",
    description: "Tu personaje 8-bit para las dinamicas de GDG Arequipa.",
    start_url: "/inicio",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b1a",
    theme_color: "#0b0b1a",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

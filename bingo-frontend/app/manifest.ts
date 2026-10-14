import type { MetadataRoute } from "next";

/** Permite "Agregar a pantalla de inicio": abre como app, sin barra del navegador. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bingo GDG · GDG Arequipa",
    short_name: "Bingo GDG",
    description: "El bingo para conocer gente en los eventos de GDG Arequipa.",
    start_url: "/cartilla",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0f0f0",
    theme_color: "#f0f0f0",
    lang: "es",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}

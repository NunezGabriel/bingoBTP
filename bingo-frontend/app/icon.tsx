import { ImageResponse } from "next/og";

// Icono de la pestana: una cartilla de bingo con los colores de Google.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const dots = ["#4285f4", "#ea4335", "#fbbc04", "#34a853"];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexWrap: "wrap",
          background: "#191919",
          padding: 3,
          gap: 2,
        }}
      >
        {dots.map((color) => (
          <div key={color} style={{ width: 12, height: 12, background: color, borderRadius: 3 }} />
        ))}
      </div>
    ),
    size,
  );
}

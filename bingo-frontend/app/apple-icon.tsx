import { ImageResponse } from "next/og";

// Icono para "agregar a pantalla de inicio".
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const dots = ["#4285f4", "#ea4335", "#fbbc04", "#34a853"];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          background: "#f0f0f0",
          padding: 18,
          gap: 10,
        }}
      >
        {dots.map((color) => (
          <div key={color} style={{ width: 62, height: 62, background: color, borderRadius: 16 }} />
        ))}
      </div>
    ),
    size,
  );
}

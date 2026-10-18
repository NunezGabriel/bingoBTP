import { ImageResponse } from "next/og";
import { marcaDataUri } from "@/lib/gdgMark";

// Icono para "agregar a pantalla de inicio". Fondo claro, el mismo que declara
// el manifest, para que no se vea un recuadro distinto al abrir la app.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f0f0",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={marcaDataUri()} alt="" width={148} height={93} />
      </div>
    ),
    size,
  );
}

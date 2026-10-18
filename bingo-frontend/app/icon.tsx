import { ImageResponse } from "next/og";
import { marcaDataUri } from "@/lib/gdgMark";

// Icono de la pestana: el logo de GDG sobre el fondo oscuro de la app.
//
// El lienzo es de 64 y no de 32 porque el navegador lo termina mostrando a 16:
// con el doble de pixeles la reduccion conserva los bordes de las barras. Y la
// marca ocupa casi todo el ancho porque a ese tamano el hueco entre el < y el
// > es lo unico que impide que las cuatro barras se lean como una mancha.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#191919",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={marcaDataUri()} alt="" width={60} height={38} />
      </div>
    ),
    size,
  );
}

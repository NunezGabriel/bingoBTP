/**
 * El logo de GDG en un solo lugar.
 *
 * Los mismos cuatro trazos los dibujan dos mundos distintos: React (el <svg>
 * de components/Brand.tsx) y Satori, el motor que arma los iconos PNG en
 * app/icon.tsx. Si cada uno guardara su copia de las coordenadas, el dia que
 * se corrija el logo se corregiria en uno solo.
 *
 * El orden importa: en cada vertice la barra de abajo tapa a la de arriba,
 * como en el logo original.
 */
export const TRAZOS = [
  { d: "M306 108 86 236", color: "#ea4335" },
  { d: "M86 264 306 392", color: "#4285f4" },
  { d: "M714 264 494 392", color: "#fbbc04" },
  { d: "M494 108 714 236", color: "#1e8e3e" },
];

export const CAJA = { ancho: 800, alto: 500, grosor: 118 };

/**
 * La marca como SVG suelto, para meterla en un data URI.
 *
 * Satori entiende una imagen SVG completa (un <img src="data:...">) mucho
 * mejor que un <svg> escrito como JSX: de la segunda forma ignora en silencio
 * cosas como stroke-linecap y las barras salen con las puntas cuadradas.
 */
export function marcaSvg() {
  const trazos = TRAZOS.map((t) => `<path d="${t.d}" stroke="${t.color}"/>`).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CAJA.ancho} ${CAJA.alto}" ` +
    `fill="none" stroke-width="${CAJA.grosor}" stroke-linecap="round">${trazos}</svg>`
  );
}

/**
 * La misma marca lista para usarse como src de una imagen.
 *
 * btoa y no Buffer: este archivo tambien lo importa Brand.tsx, que termina en
 * el bundle del navegador, y ahi Buffer no existe.
 */
export function marcaDataUri() {
  return `data:image/svg+xml;base64,${btoa(marcaSvg())}`;
}

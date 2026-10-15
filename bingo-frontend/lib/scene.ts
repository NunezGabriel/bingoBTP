/**
 * El escenario del lobby: la Plaza de Armas con el Misti al fondo.
 *
 * Todo se dibuja en una rejilla de pixeles (cada "pixel" son 4 unidades del
 * mundo) con rectangulos alineados a esa rejilla. Nada de curvas suaves ni
 * degradados continuos: los triangulos van escalonados y los circulos por
 * filas, que es lo que hace que se vea pixel art y no una ilustracion plana.
 *
 * Son dos capas y por una razon concreta: si todo fuera una sola imagen en
 * coordenadas del mundo, la camara (que sigue al jugador) dejaria el volcan
 * fuera de pantalla casi siempre. El cielo va pegado arriba y se desplaza
 * despacio; el suelo va en coordenadas del mundo, debajo.
 */

/** Suelo de la plaza: por donde se puede caminar. */
export const FLOOR = { top: 300, bottom: 520, left: 40, right: 920 };

export const SKY = { w: 1200, h: 300 };
/** Unidades del mundo que mide cada pixel del dibujo. */
export const P = 4;

type Ctx = CanvasRenderingContext2D;

/** Un rectangulo en pixeles del dibujo. */
function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x) * P, Math.round(y) * P, Math.max(1, Math.round(w)) * P, Math.max(1, Math.round(h)) * P);
}

/** Triangulo escalonado: la silueta de un volcan. */
function mountain(
  ctx: Ctx,
  cx: number,
  base: number,
  halfW: number,
  height: number,
  color: string,
  shade: string,
) {
  for (let i = 0; i < height; i += 1) {
    const y = base - height + i;
    const w = Math.round(((i + 1) / height) * halfW * 2);
    const x = cx - Math.round(w / 2);
    px(ctx, x, y, w, 1, color);
    // La mitad derecha, un tono mas oscura: le da volumen sin degradados.
    px(ctx, cx, y, Math.round(w / 2), 1, shade);
  }
}

/** Nieve de la cumbre, con lenguas bajando por la ladera. */
function snowCap(ctx: Ctx, cx: number, top: number, rows: number, white: string, cold: string) {
  for (let i = 0; i < rows; i += 1) {
    const w = 3 + i * 2;
    px(ctx, cx - Math.floor(w / 2), top + i, w, 1, i > rows - 3 ? cold : white);
  }
  px(ctx, cx - Math.floor(rows / 2) - 1, top + rows, 2, 2, white);
  px(ctx, cx + Math.floor(rows / 2) - 1, top + rows, 2, 3, white);
  px(ctx, cx - 1, top + rows, 2, 2, cold);
}

/** Arco de sillar: el motivo que se repite en la catedral y los portales. */
function arch(ctx: Ctx, x: number, y: number, w: number, h: number, hueco: string, piedra: string) {
  px(ctx, x, y, w, h, piedra);
  const r = Math.floor(w / 2);
  for (let i = 0; i < r; i += 1) {
    const inset = r - 1 - i;
    px(ctx, x + 1 + inset, y + 2 + i, w - 2 - inset * 2, 1, hueco);
  }
  px(ctx, x + 1, y + 2 + r, w - 2, h - 2 - r, hueco);
}

/* ---------------------------------------------------------------- cielo ---- */

export function drawSky(ctx: Ctx) {
  const W = SKY.w / P; // 300
  const H = SKY.h / P; // 75

  // Cielo en bandas: un degradado de verdad no se ve pixelado.
  const bandas = ["#6fbfe8", "#86cbec", "#9ed6ef", "#b8e1f2", "#d2ecf5", "#eaf3f0", "#f7e9cd"];
  const alto = Math.ceil(H / bandas.length);
  bandas.forEach((c, i) => px(ctx, 0, i * alto, W, alto, c));

  // Nubes
  const nube = (x: number, y: number) => {
    px(ctx, x, y, 10, 3, "#ffffff");
    px(ctx, x + 2, y - 2, 6, 2, "#ffffff");
    px(ctx, x + 5, y - 3, 4, 2, "#ffffff");
    px(ctx, x + 1, y + 3, 8, 1, "#e6f2f8");
  };
  nube(26, 12);
  nube(74, 7);
  nube(232, 10);
  nube(268, 16);

  // Chachani y Pichu Pichu detras; el Misti al centro, mas alto.
  mountain(ctx, 58, 72, 62, 38, "#9d8b7c", "#7d6c5f");
  mountain(ctx, 248, 72, 58, 33, "#9d8b7c", "#7d6c5f");
  mountain(ctx, 150, 75, 78, 56, "#8d6e63", "#6b5249");
  snowCap(ctx, 150, 19, 7, "#ffffff", "#dceaf0");

  // Grietas de la ladera del Misti
  for (const [x, y, h] of [
    [138, 40, 10],
    [160, 36, 14],
    [147, 52, 8],
    [168, 50, 9],
  ]) {
    px(ctx, x, y, 1, h, "#6b5249");
  }

  // ---- Catedral de sillar ----
  const cx = 150;
  const cuerpoX = cx - 56;
  px(ctx, cuerpoX, 48, 112, 27, "#efe7d6"); // fachada
  px(ctx, cuerpoX, 48, 112, 2, "#dcd0b7"); // cornisa
  px(ctx, cuerpoX, 56, 112, 1, "#dcd0b7");

  // Torres
  for (const tx of [cuerpoX - 10, cuerpoX + 106]) {
    px(ctx, tx, 34, 14, 41, "#efe7d6");
    px(ctx, tx, 34, 14, 2, "#dcd0b7");
    px(ctx, tx + 2, 38, 10, 8, "#cfc3ae"); // campanario
    arch(ctx, tx + 3, 39, 8, 7, "#6b5f4e", "#cfc3ae");
    // Cupulita
    px(ctx, tx + 1, 30, 12, 4, "#d8ccb4");
    px(ctx, tx + 3, 27, 8, 3, "#d8ccb4");
    px(ctx, tx + 5, 25, 4, 2, "#d8ccb4");
    px(ctx, tx + 6, 22, 2, 3, "#b9a98c");
  }

  // Arqueria de la fachada
  for (let i = 0; i < 7; i += 1) arch(ctx, cuerpoX + 6 + i * 15, 58, 11, 17, "#7a6b57", "#e4dac4");
  // Portada central
  px(ctx, cx - 9, 50, 18, 25, "#e4dac4");
  arch(ctx, cx - 7, 54, 14, 21, "#5e5243", "#d8ccb4");
  px(ctx, cx - 2, 42, 4, 8, "#d8ccb4");
  px(ctx, cx - 1, 39, 2, 3, "#b9a98c");

  // ---- Portales a los lados ----
  for (const [x0, n] of [
    [4, 9],
    [206, 9],
  ] as [number, number][]) {
    px(ctx, x0, 56, n * 10 + 2, 19, "#e9dfca");
    px(ctx, x0, 56, n * 10 + 2, 2, "#d5c8ad");
    for (let i = 0; i < n; i += 1) arch(ctx, x0 + 2 + i * 10, 60, 8, 15, "#776a56", "#e9dfca");
  }
}

/* ---------------------------------------------------------------- suelo ---- */

/** Fila de un ovalo, escalonada. */
function ovalRow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let dy = -ry; dy <= ry; dy += 1) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    if (w <= 0) continue;
    px(ctx, cx - w, cy + dy, w * 2, 1, color);
  }
}

function palm(ctx: Ctx, x: number, baseY: number, alto: number) {
  px(ctx, x, baseY - alto, 2, alto, "#6d4c41");
  for (let i = 0; i < alto; i += 3) px(ctx, x, baseY - alto + i, 2, 1, "#5a3e35");
  // Hojas
  const hoja = (dx: number, dy: number, w: number) =>
    px(ctx, x + dx, baseY - alto + dy, w, 1, "#2e7d32");
  hoja(-7, -1, 7);
  hoja(-8, 0, 6);
  hoja(2, -1, 7);
  hoja(3, 0, 6);
  hoja(-5, -3, 4);
  hoja(2, -3, 4);
  px(ctx, x - 1, baseY - alto - 2, 4, 2, "#34a853");
}

function banca(ctx: Ctx, x: number, y: number) {
  px(ctx, x, y, 11, 2, "#8d6e63");
  px(ctx, x, y + 2, 11, 1, "#6d4c41");
  px(ctx, x + 1, y + 3, 2, 2, "#5a3e35");
  px(ctx, x + 8, y + 3, 2, 2, "#5a3e35");
}

function farol(ctx: Ctx, x: number, baseY: number) {
  px(ctx, x, baseY - 11, 2, 11, "#3d3d3d");
  px(ctx, x - 1, baseY - 15, 4, 4, "#fbbc04");
  px(ctx, x - 2, baseY - 16, 6, 1, "#3d3d3d");
  px(ctx, x - 1, baseY - 17, 4, 1, "#3d3d3d");
  px(ctx, x - 2, baseY, 6, 1, "#3d3d3d");
}

export function drawGround(ctx: Ctx, w: number, h: number) {
  const W = w / P; // 240
  const H = h / P; // 135
  const top = Math.round((FLOOR.top - 48) / P);

  // Baldosas: dos tonos alternados, con junta mas oscura.
  for (let y = top; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const tile = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0;
      px(ctx, x, y, 1, 1, tile ? "#dbd5c8" : "#d2ccbe");
    }
  }
  for (let y = top; y < H; y += 6) px(ctx, 0, y, W, 1, "#c5bfb1");
  for (let x = 0; x < W; x += 6) px(ctx, x, top, 1, H - top, "#c5bfb1");

  // Vereda del borde de arriba
  px(ctx, 0, top, W, 2, "#c9c2b2");
  px(ctx, 0, top + 2, W, 1, "#b8b1a1");

  // Camino que cruza la plaza por delante de la pileta. Solo horizontal: uno
  // vertical se ve como una columna saliendo de la catedral.
  px(ctx, 0, 95, W, 8, "#e5dfd2");
  px(ctx, 0, 95, W, 1, "#c9c2b2");
  px(ctx, 0, 102, W, 1, "#c9c2b2");

  // Jardines
  const jardin = (x: number, y: number, jw: number, jh: number) => {
    px(ctx, x, y, jw, jh, "#5f9e45");
    px(ctx, x, y + jh - 2, jw, 2, "#4c8038");
    px(ctx, x, y, jw, 1, "#79b85c");
    for (let i = 0; i < jw * jh * 0.06; i += 1) {
      const fx = x + ((i * 7) % jw);
      const fy = y + 1 + ((i * 5) % (jh - 3));
      px(ctx, fx, fy, 1, 1, i % 3 === 0 ? "#f2c14e" : "#79b85c");
    }
    px(ctx, x, y, 1, jh, "#c9c2b2");
    px(ctx, x + jw - 1, y, 1, jh, "#c9c2b2");
  };
  jardin(12, 78, 36, 14);
  jardin(192, 78, 36, 14);
  jardin(12, 108, 36, 14);
  jardin(192, 108, 36, 14);

  palm(ctx, 22, 78, 16);
  palm(ctx, 38, 78, 12);
  palm(ctx, 200, 78, 15);
  palm(ctx, 216, 78, 11);

  banca(ctx, 60, 86);
  banca(ctx, 170, 86);
  banca(ctx, 60, 116);
  banca(ctx, 170, 116);
  farol(ctx, 54, 100);
  farol(ctx, 186, 100);

  // ---- Pileta ----
  const fx = 120;
  const fy = 103;
  ovalRow(ctx, fx, fy, 24, 9, "#b9b2a3"); // borde
  ovalRow(ctx, fx, fy, 21, 7, "#cfc8ba");
  ovalRow(ctx, fx, fy, 19, 6, "#5fa8d3"); // agua
  ovalRow(ctx, fx, fy - 1, 15, 4, "#7fc0e3");
  px(ctx, fx - 9, fy - 2, 4, 1, "#bfe6f7");
  px(ctx, fx + 4, fy + 1, 5, 1, "#bfe6f7");
  // Pedestal y taza
  px(ctx, fx - 3, fy - 12, 6, 12, "#cfc8ba");
  px(ctx, fx - 3, fy - 12, 6, 1, "#b9b2a3");
  ovalRow(ctx, fx, fy - 13, 9, 3, "#cfc8ba");
  ovalRow(ctx, fx, fy - 14, 7, 2, "#7fc0e3");
  px(ctx, fx - 1, fy - 18, 2, 4, "#cfc8ba");
  px(ctx, fx - 2, fy - 19, 4, 1, "#bfe6f7");
  // Chorros
  px(ctx, fx - 6, fy - 16, 1, 3, "#bfe6f7");
  px(ctx, fx + 5, fy - 16, 1, 3, "#bfe6f7");
}

/**
 * El escenario del lobby: la Plaza de Armas de noche, con el Misti al fondo.
 *
 * Todo se dibuja en una rejilla de pixeles (cada "pixel" son 2 unidades del
 * mundo) con rectangulos alineados a esa rejilla. Nada de curvas suaves ni
 * degradados continuos: los triangulos van escalonados y los ovalos por filas,
 * que es lo que hace que se vea pixel art y no una ilustracion plana.
 *
 * Son dos capas y por una razon concreta: si todo fuera una sola imagen en
 * coordenadas del mundo, la camara (que sigue al jugador) dejaria el volcan
 * fuera de pantalla casi siempre. El cielo va pegado arriba y se desplaza
 * despacio; el suelo va en coordenadas del mundo, debajo.
 *
 * Sobre el rendimiento: las dos capas se pintan UNA vez en canvas aparte, por
 * grande que sea el dibujo, y en cada cuadro solo se copia el pedazo visible.
 * Que la plaza tenga mas detalle no cuesta un solo milisegundo mas por cuadro.
 *
 * Para volver al dia basta cambiar HORA: los colores salen todos de PALETA.
 */

/**
 * Tamano del mundo. Ancho a proposito, porque la camara solo se mueve en
 * horizontal; y profundo, porque cuanto mas alta es la plaza menos hay que
 * acercar la camara para que entre, y mas gente se ve de una sola vez.
 */
export const WORLD = { w: 1800, h: 840 };
/** Suelo de la plaza: por donde se puede caminar. */
export const FLOOR = { top: 360, bottom: 816, left: 60, right: 1740 };
export const SKY = { w: 1600, h: 320 };
/** Unidades del mundo que mide cada pixel del dibujo. */
export const P = 2;
/** Donde empieza el suelo, en pixeles del dibujo. */
export const GROUND_TOP = 152;

type Ctx = CanvasRenderingContext2D;

const PALETA = {
  noche: {
    cielo: ["#080c28", "#0d1336", "#141d47", "#1c2a5a", "#26396d", "#32507e", "#43688c", "#5c7f98"],
    estrella: "#ffffff",
    estrellaTenue: "#b9c6e8",
    luna: "#f8f4de",
    lunaSombra: "#dcd6b8",
    nube: "#232f5e",
    cerro: "#2b2f44",
    cerroLuz: "#363c52",
    cerroSombra: "#1f2231",
    volcan: "#372f42",
    volcanLuz: "#453b52",
    volcanSombra: "#241f2c",
    nieve: "#e6edf8",
    nieveSombra: "#b4c2da",
    sillar: "#6d6858",
    sillarLuz: "#878069",
    sillarSombra: "#514d41",
    vano: "#231f1a",
    vanoLuz: "#f2b84a",
    vanoLuzSuave: "#8a6b33",
    piso: ["#464651", "#41414b", "#4b4b57"],
    pisoLuz: "#54545f",
    junta: "#36363f",
    vereda: "#53535f",
    veredaLuz: "#616170",
    camino: "#5a5a66",
    caminoLuz: "#67677a",
    jardin: "#2d5733",
    jardinLuz: "#386b3e",
    jardinSombra: "#22442a",
    flor: "#d9b44c",
    florRosa: "#c96a9a",
    tronco: "#3a2b24",
    troncoLuz: "#4a382e",
    hoja: "#2a5e2f",
    hojaLuz: "#36763b",
    banca: "#4b3a2f",
    bancaLuz: "#5e4a3b",
    sombra: "rgba(0,0,0,0.28)",
    farol: "#2a2a30",
    farolLuz: "#3b3b45",
    luz: "#f5c463",
    luzFuerte: "#fff3cd",
    luzSuelo: ["#5a5347", "#514b42", "#49453d"],
    agua: "#2c6a92",
    aguaClara: "#3f87af",
    aguaBrillo: "#8fd0e8",
    aguaEspuma: "#d6f1fb",
    piedra: "#5c5749",
    piedraLuz: "#726c5b",
    piedraSombra: "#45413a",
  },
};

const HORA: keyof typeof PALETA = "noche";
const C = PALETA[HORA];

/** Un rectangulo en pixeles del dibujo. */
function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x) * P,
    Math.round(y) * P,
    Math.max(1, Math.round(w)) * P,
    Math.max(1, Math.round(h)) * P,
  );
}

/** Fila de un ovalo, escalonada. */
function ovalo(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let dy = -ry; dy <= ry; dy += 1) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    if (w <= 0) continue;
    px(ctx, cx - w, cy + dy, w * 2, 1, color);
  }
}

/* ------------------------------------------------------- letras de 3x5 ---- */

const FONT: Record<string, string[]> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  G: ["###", "#..", "#.#", "#.#", "###"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  P: ["###", "#.#", "###", "#..", "#.."],
  Q: ["###", "#.#", "#.#", "###", "..#"],
  R: ["###", "#.#", "##.", "#.#", "#.#"],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  " ": ["...", "...", "...", "...", "..."],
};

function letra(ctx: Ctx, ch: string, x: number, y: number, color: string) {
  const glyph = FONT[ch.toUpperCase()];
  if (!glyph) return;
  glyph.forEach((row, ry) => {
    [...row].forEach((c, rx) => {
      if (c === "#") px(ctx, x + rx, y + ry, 1, 1, color);
    });
  });
}

/* ----------------------------------------------------------- montanas ---- */

function mountain(
  ctx: Ctx,
  cx: number,
  base: number,
  halfW: number,
  height: number,
  color: string,
  luz: string,
  sombra: string,
) {
  for (let i = 0; i < height; i += 1) {
    const y = base - height + i;
    const w = Math.round(((i + 1) / height) * halfW * 2);
    const x = cx - Math.round(w / 2);
    px(ctx, x, y, w, 1, color);
    // Ladera izquierda con un toque de luna, derecha en sombra.
    px(ctx, x, y, Math.max(1, Math.round(w * 0.22)), 1, luz);
    px(ctx, cx, y, Math.round(w / 2), 1, sombra);
  }
}

function snowCap(ctx: Ctx, cx: number, top: number, rows: number) {
  for (let i = 0; i < rows; i += 1) {
    const w = 5 + i * 3;
    px(ctx, cx - Math.floor(w / 2), top + i, w, 1, i > rows - 4 ? C.nieveSombra : C.nieve);
  }
  // Lenguas de nieve bajando por las quebradas
  for (const [dx, len] of [[-9, 7], [-3, 4], [4, 8], [10, 5]] as [number, number][]) {
    px(ctx, cx + dx, top + rows, 2, len, dx > 0 ? C.nieveSombra : C.nieve);
  }
}

function arch(ctx: Ctx, x: number, y: number, w: number, h: number, hueco: string, piedra: string) {
  px(ctx, x, y, w, h, piedra);
  const r = Math.floor(w / 2);
  for (let i = 0; i < r; i += 1) {
    const inset = r - 1 - i;
    px(ctx, x + 1 + inset, y + 2 + i, w - 2 - inset * 2, 1, hueco);
  }
  px(ctx, x + 1, y + 2 + r, w - 2, h - 2 - r, hueco);
}

/* --------------------------------------------------------------- cielo ---- */

export function drawSky(ctx: Ctx) {
  const W = SKY.w / P; // 800
  const H = SKY.h / P; // 160

  const alto = Math.ceil(H / C.cielo.length);
  C.cielo.forEach((c, i) => px(ctx, 0, i * alto, W, alto, c));

  // Estrellas fijas: si fueran aleatorias cambiarian cada vez que se repinta.
  for (let i = 0; i < 150; i += 1) {
    const x = (i * 97 + 13) % W;
    const y = (i * 53 + 7) % 70;
    px(ctx, x, y, 1, 1, i % 3 === 0 ? C.estrellaTenue : C.estrella);
  }
  for (const [x, y] of [[96, 18], [392, 24], [622, 14], [250, 40]]) {
    px(ctx, x - 2, y, 5, 1, C.estrella);
    px(ctx, x, y - 2, 1, 5, C.estrella);
  }

  // Luna con sus crateres
  ovalo(ctx, 660, 34, 11, 11, C.luna);
  ovalo(ctx, 663, 31, 3, 2, C.lunaSombra);
  ovalo(ctx, 657, 38, 4, 3, C.lunaSombra);
  ovalo(ctx, 666, 40, 2, 2, C.lunaSombra);
  ovalo(ctx, 660, 34, 14, 14, "rgba(248,244,222,0.06)");

  const nube = (x: number, y: number, w: number) => {
    px(ctx, x, y, w, 4, C.nube);
    px(ctx, x + 4, y - 3, w - 10, 3, C.nube);
    px(ctx, x + 10, y - 5, 8, 2, C.nube);
  };
  nube(70, 62, 34);
  nube(500, 52, 40);
  nube(300, 74, 26);

  // Chachani, Misti y Pichu Pichu
  mountain(ctx, 150, 156, 150, 78, C.cerro, C.cerroLuz, C.cerroSombra);
  mountain(ctx, 660, 156, 140, 70, C.cerro, C.cerroLuz, C.cerroSombra);
  mountain(ctx, 400, 160, 186, 116, C.volcan, C.volcanLuz, C.volcanSombra);
  snowCap(ctx, 400, 46, 15);

  // Quebradas del Misti
  for (const [x, y, h] of [
    [372, 92, 24],
    [424, 84, 32],
    [392, 118, 18],
    [440, 112, 22],
    [358, 126, 14],
  ] as [number, number, number][]) {
    px(ctx, x, y, 1, h, C.volcanSombra);
    px(ctx, x + 1, y, 1, h - 4, C.volcanLuz);
  }

  // ---- Catedral ----
  const cx = 400;
  const fach = cx - 124;
  px(ctx, fach, 104, 248, 56, C.sillar);
  px(ctx, fach, 104, 248, 3, C.sillarLuz);
  px(ctx, fach, 118, 248, 2, C.sillarSombra);
  px(ctx, fach, 121, 248, 1, C.sillarLuz);

  for (const tx of [fach - 24, fach + 236]) {
    px(ctx, tx, 72, 32, 88, C.sillar);
    px(ctx, tx, 72, 32, 3, C.sillarLuz);
    px(ctx, tx, 72, 3, 88, C.sillarLuz);
    px(ctx, tx + 29, 72, 3, 88, C.sillarSombra);
    arch(ctx, tx + 8, 82, 16, 16, C.vanoLuz, C.sillarSombra);
    px(ctx, tx + 2, 64, 28, 8, C.sillarLuz);
    px(ctx, tx + 7, 57, 18, 7, C.sillarLuz);
    px(ctx, tx + 11, 51, 10, 6, C.sillar);
    px(ctx, tx + 14, 44, 4, 7, C.sillarSombra);
  }

  for (let i = 0; i < 8; i += 1) {
    arch(ctx, fach + 10 + i * 30, 124, 22, 36, C.vanoLuz, C.sillarLuz);
    px(ctx, fach + 10 + i * 30, 124, 22, 1, C.sillarSombra);
  }
  px(ctx, cx - 22, 92, 44, 68, C.sillarLuz);
  arch(ctx, cx - 16, 100, 32, 60, C.vanoLuz, C.sillar);
  px(ctx, cx - 4, 76, 8, 16, C.sillarLuz);
  px(ctx, cx - 2, 68, 4, 8, C.sillarSombra);

  // ---- Portales ----
  for (const x0 of [4, 572] as number[]) {
    px(ctx, x0, 120, 224, 40, C.sillar);
    px(ctx, x0, 120, 224, 3, C.sillarLuz);
    for (let i = 0; i < 10; i += 1) {
      arch(ctx, x0 + 6 + i * 22, 128, 18, 32, C.vanoLuz, C.sillarSombra);
      px(ctx, x0 + 6 + i * 22, 128, 18, 1, C.sillarLuz);
    }
  }
}

/* --------------------------------------------------------------- avion ---- */

const CARTEL = "GDG AREQUIPA";

/**
 * El avioncito con su cartel, que va ATRAS y ondeando.
 *
 * El cartel se dibuja columna por columna, cada una con su propio desfase de
 * la onda: por eso se ve como una tela y no como un rectangulo que sube y baja.
 */
export function drawPlane(ctx: Ctx, x: number, y: number, fase: number) {
  const anchoLetra = 8;
  const ancho = CARTEL.length * anchoLetra + 8;
  const bx = x - 22 - ancho;
  const onda = (i: number) => Math.round(Math.sin(fase + i * 0.55) * 3);

  // Tela del cartel
  for (let i = 0; i < ancho; i += 1) {
    const dy = onda(i / anchoLetra);
    px(ctx, bx + i, y - 9 + dy, 1, 22, "#ea4335");
    px(ctx, bx + i, y - 9 + dy, 1, 2, "#ff7a6f");
    px(ctx, bx + i, y + 11 + dy, 1, 2, "#a8201a");
  }
  [...CARTEL].forEach((ch, i) => {
    const dy = onda(i + 0.5);
    letra(ctx, ch, bx + 5 + i * anchoLetra, y - 4 + dy, "#ffffff");
  });

  // Cuerda
  for (let i = 0; i < 12; i += 1) {
    px(ctx, bx + ancho + i, y + 2 + onda(-0.5 + i * 0.08), 1, 1, "#d8d8d8");
  }

  // Avion
  px(ctx, x - 10, y - 2, 20, 6, "#e8e8e8");
  px(ctx, x - 10, y - 2, 20, 2, "#ffffff");
  px(ctx, x + 8, y - 5, 4, 4, "#e8e8e8");
  px(ctx, x - 9, y + 4, 10, 2, "#c2c2c2");
  px(ctx, x - 5, y - 7, 9, 5, "#4285f4");
  px(ctx, x - 5, y - 7, 9, 1, "#7aa9f7");
  px(ctx, x - 10, y - 6, 4, 4, "#c2c2c2");
  px(ctx, x + 9, y, 3, 2, "#fbbc04");
  px(ctx, x - 2, y - 1, 2, 2, "#2a3550");
}

/* --------------------------------------------------------------- suelo ---- */

function palmera(ctx: Ctx, x: number, baseY: number, alto: number) {
  ovalo(ctx, x + 1, baseY + 1, 9, 3, C.sombra);
  for (let i = 0; i < alto; i += 1) {
    px(ctx, x, baseY - alto + i, 4, 1, i % 4 === 3 ? C.tronco : C.troncoLuz);
    px(ctx, x + 3, baseY - alto + i, 1, 1, C.tronco);
  }
  const hoja = (dx: number, dy: number, w: number, color: string) =>
    px(ctx, x + dx, baseY - alto + dy, w, 1, color);
  hoja(-15, 0, 15, C.hoja);
  hoja(-17, 1, 13, C.hoja);
  hoja(-12, -2, 11, C.hojaLuz);
  hoja(5, 0, 15, C.hoja);
  hoja(7, 1, 13, C.hoja);
  hoja(6, -2, 11, C.hojaLuz);
  hoja(-9, -4, 8, C.hojaLuz);
  hoja(5, -4, 8, C.hojaLuz);
  px(ctx, x - 2, baseY - alto - 6, 8, 4, C.hojaLuz);
  px(ctx, x - 1, baseY - alto - 7, 6, 1, C.hoja);
  // Cocos
  px(ctx, x - 3, baseY - alto - 1, 2, 2, "#6b4a2a");
  px(ctx, x + 5, baseY - alto - 1, 2, 2, "#6b4a2a");
}

function banca(ctx: Ctx, x: number, y: number) {
  ovalo(ctx, x + 12, y + 7, 14, 3, C.sombra);
  px(ctx, x, y, 24, 3, C.bancaLuz); // respaldo
  px(ctx, x, y + 3, 24, 1, C.banca);
  px(ctx, x, y + 5, 24, 3, C.bancaLuz); // asiento
  px(ctx, x, y + 8, 24, 1, C.banca);
  px(ctx, x + 2, y + 9, 3, 4, C.banca);
  px(ctx, x + 19, y + 9, 3, 4, C.banca);
}

/** Farol encendido, con su charco de luz. */
function farol(ctx: Ctx, x: number, baseY: number) {
  // La luz va primero: el poste se dibuja encima.
  ovalo(ctx, x + 1, baseY + 4, 30, 11, C.luzSuelo[2]);
  ovalo(ctx, x + 1, baseY + 4, 21, 8, C.luzSuelo[1]);
  ovalo(ctx, x + 1, baseY + 4, 12, 5, C.luzSuelo[0]);

  px(ctx, x - 4, baseY - 2, 10, 3, C.farol);
  px(ctx, x - 2, baseY - 26, 4, 24, C.farol);
  px(ctx, x - 2, baseY - 26, 1, 24, C.farolLuz);
  px(ctx, x - 4, baseY - 36, 8, 10, C.luz);
  px(ctx, x - 3, baseY - 35, 6, 8, C.luzFuerte);
  px(ctx, x - 5, baseY - 38, 10, 2, C.farol);
  px(ctx, x - 3, baseY - 40, 6, 2, C.farol);
  px(ctx, x - 1, baseY - 42, 2, 2, C.farol);
}

function jardin(ctx: Ctx, x: number, y: number, w: number, h: number) {
  px(ctx, x, y, w, h, C.jardin);
  px(ctx, x, y, w, 2, C.jardinLuz);
  px(ctx, x, y + h - 3, w, 3, C.jardinSombra);
  // Mata a mata. El reparto es pseudoaleatorio pero fijo: con un modulo simple
  // las flores salian en diagonal y se veia una trama, no un jardin.
  let semilla = (x * 7919 + y * 104729) >>> 0;
  const azar = () => {
    semilla = (semilla * 1664525 + 1013904223) >>> 0;
    return semilla / 4294967296;
  };
  for (let i = 0; i < w * h * 0.035; i += 1) {
    const fx = x + 2 + Math.floor(azar() * (w - 4));
    const fy = y + 2 + Math.floor(azar() * (h - 5));
    px(ctx, fx, fy, 2, 2, i % 4 === 0 ? C.florRosa : C.flor);
    px(ctx, fx, fy, 1, 1, "#ffffff");
  }
  // Sardinel
  px(ctx, x - 1, y - 1, w + 2, 1, C.veredaLuz);
  px(ctx, x - 1, y - 1, 1, h + 2, C.veredaLuz);
  px(ctx, x + w, y - 1, 1, h + 2, C.vereda);
  px(ctx, x - 1, y + h, w + 2, 1, C.vereda);
}

export function drawGround(ctx: Ctx) {
  const W = WORLD.w / P; // 900
  const H = WORLD.h / P; // 310
  const top = GROUND_TOP;

  // Baldosas de 8x8 con tres tonos: el ruido fijo evita que se vea un damero.
  for (let y = top; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const tx = Math.floor(x / 8);
      const ty = Math.floor(y / 8);
      const tono = (tx * 7 + ty * 13) % 3;
      px(ctx, x, y, 1, 1, C.piso[tono]);
    }
  }
  // Juntas y brillo del borde de cada baldosa
  for (let y = top; y < H; y += 8) {
    px(ctx, 0, y, W, 1, C.junta);
    px(ctx, 0, y + 1, W, 1, C.pisoLuz);
  }
  for (let x = 0; x < W; x += 8) {
    px(ctx, x, top, 1, H - top, C.junta);
    px(ctx, x + 1, top, 1, H - top, C.pisoLuz);
  }

  // Vereda de arriba, con sardinel
  px(ctx, 0, top, W, 5, C.vereda);
  px(ctx, 0, top, W, 2, C.veredaLuz);
  px(ctx, 0, top + 5, W, 2, C.junta);

  // Dos caminos cruzando la plaza
  for (const cy of [212, 344]) {
    px(ctx, 0, cy, W, 18, C.camino);
    px(ctx, 0, cy, W, 2, C.caminoLuz);
    px(ctx, 0, cy + 16, W, 2, C.junta);
    for (let x = 0; x < W; x += 12) px(ctx, x, cy + 2, 1, 14, C.junta);
  }

  // Jardines, en tres filas de profundidad
  for (const jx of [28, 184, 600, 756]) {
    jardin(ctx, jx, 166, 88, 32);
    jardin(ctx, jx, 250, 88, 32);
    jardin(ctx, jx, 376, 88, 28);
  }

  for (const [x, alto] of [
    [52, 34],
    [96, 26],
    [208, 30],
    [252, 24],
    [624, 32],
    [668, 24],
    [780, 34],
    [824, 26],
  ] as [number, number][]) {
    palmera(ctx, x, 166, alto);
  }
  for (const [x, alto] of [
    [60, 26],
    [228, 22],
    [640, 24],
    [796, 26],
  ] as [number, number][]) {
    palmera(ctx, x, 376, alto);
  }

  for (const bx of [124, 320, 536, 712]) {
    banca(ctx, bx, 182);
    banca(ctx, bx, 266);
    banca(ctx, bx, 392);
  }

  for (const fx of [156, 300, 600, 744]) farol(ctx, fx, 208);
  for (const fx of [228, 672]) farol(ctx, fx, 340);

  // ---- Pileta ----
  const fx = 450;
  const fy = 280;
  ovalo(ctx, fx, fy + 4, 76, 26, C.sombra);
  ovalo(ctx, fx, fy, 70, 25, C.piedraSombra);
  ovalo(ctx, fx, fy - 1, 68, 24, C.piedra);
  ovalo(ctx, fx, fy - 2, 62, 21, C.piedraLuz);
  ovalo(ctx, fx, fy, 58, 18, C.agua);
  ovalo(ctx, fx, fy - 1, 50, 14, C.aguaClara);
  // Reflejos del agua
  for (const [dx, dy, w] of [
    [-34, -6, 14],
    [10, 4, 18],
    [-14, 8, 10],
    [24, -8, 12],
  ] as [number, number, number][]) {
    px(ctx, fx + dx, fy + dy, w, 1, C.aguaBrillo);
  }
  // Pedestal y tazas
  px(ctx, fx - 9, fy - 34, 18, 34, C.piedraLuz);
  px(ctx, fx + 5, fy - 34, 4, 34, C.piedra);
  ovalo(ctx, fx, fy - 36, 26, 8, C.piedraLuz);
  ovalo(ctx, fx, fy - 37, 22, 6, C.aguaClara);
  px(ctx, fx - 3, fy - 50, 6, 14, C.piedraLuz);
  ovalo(ctx, fx, fy - 51, 13, 4, C.piedraLuz);
  ovalo(ctx, fx, fy - 52, 10, 3, C.aguaClara);
  // Chorros
  for (const [dx, dy, h] of [
    [-16, -46, 10],
    [16, -46, 10],
    [-10, -42, 8],
    [10, -42, 8],
    [0, -58, 7],
  ] as [number, number, number][]) {
    px(ctx, fx + dx, fy + dy, 2, h, C.aguaEspuma);
  }
  px(ctx, fx - 6, fy - 60, 12, 2, C.aguaEspuma);
}

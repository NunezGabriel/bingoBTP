/**
 * El escenario del lobby: la Plaza de Armas de noche, con el Misti al fondo.
 *
 * Todo se dibuja en una rejilla de pixeles (cada "pixel" son 4 unidades del
 * mundo) con rectangulos alineados a esa rejilla. Nada de curvas suaves ni
 * degradados continuos: los triangulos van escalonados y los ovalos por filas,
 * que es lo que hace que se vea pixel art y no una ilustracion plana.
 *
 * Son dos capas y por una razon concreta: si todo fuera una sola imagen en
 * coordenadas del mundo, la camara (que sigue al jugador) dejaria el volcan
 * fuera de pantalla casi siempre. El cielo va pegado arriba y se desplaza
 * despacio; el suelo va en coordenadas del mundo, debajo.
 *
 * Para volver al dia basta cambiar HORA: los colores salen todos de PALETA.
 */

/** Tamano del mundo. Ancho a proposito: la camara solo se mueve en horizontal. */
export const WORLD = { w: 1800, h: 620 };
/** Suelo de la plaza: por donde se puede caminar. */
export const FLOOR = { top: 350, bottom: 596, left: 60, right: 1740 };
export const SKY = { w: 1600, h: 320 };
/** Unidades del mundo que mide cada pixel del dibujo. */
export const P = 4;
/** Donde empieza el suelo, en pixeles del dibujo. */
export const GROUND_TOP = 76;

type Ctx = CanvasRenderingContext2D;

const PALETA = {
  noche: {
    cielo: ["#0a1030", "#121a44", "#1b2a5c", "#27406f", "#365880", "#4b7190", "#6b8a9c"],
    estrella: "#ffffff",
    luna: "#f6f2d8",
    lunaSombra: "#ddd8bb",
    nube: "#2a3a6a",
    cerro: "#2e3246",
    cerroSombra: "#232636",
    volcan: "#3a3344",
    volcanSombra: "#2a2533",
    nieve: "#dfe8f5",
    nieveSombra: "#b9c6dc",
    sillar: "#6f6a5a",
    sillarSombra: "#5a5649",
    sillarClaro: "#837c69",
    vano: "#2a2722",
    vanoLuz: "#f0b347",
    piso: ["#4a4a52", "#44444c"],
    junta: "#3b3b43",
    vereda: "#55555e",
    camino: "#585863",
    jardin: "#2f5a33",
    jardinSombra: "#25472a",
    flor: "#d8b24a",
    tronco: "#3a2a24",
    hoja: "#2a5e2f",
    banca: "#4a3a30",
    bancaSombra: "#36291f",
    farol: "#2b2b31",
    luz: "#f3c061",
    luzSuelo: "#5d5648",
    agua: "#2f6f96",
    aguaClara: "#4a93b8",
    aguaBrillo: "#8fd0e8",
    piedra: "#5f5a4e",
    piedraClara: "#746e5e",
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

/* ------------------------------------------------------- letras de 3x5 ---- */

const FONT: Record<string, string[]> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  F: ["###", "#..", "##.", "#..", "#.."],
  G: ["###", "#..", "#.#", "#.#", "###"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  P: ["###", "#.#", "###", "#..", "#.."],
  Q: ["###", "#.#", "#.#", "###", "..#"],
  R: ["###", "#.#", "##.", "#.#", "#.#"],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  " ": ["...", "...", "...", "...", "..."],
};

/** Texto en pixeles, para los carteles. Lo que no este en la fuente se salta. */
function texto(ctx: Ctx, str: string, x: number, y: number, color: string) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const glyph = FONT[ch];
    if (glyph) {
      glyph.forEach((row, ry) => {
        [...row].forEach((c, rx) => {
          if (c === "#") px(ctx, cx + rx, y + ry, 1, 1, color);
        });
      });
    }
    cx += 4;
  }
}

/* ----------------------------------------------------------- montanas ---- */

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
    px(ctx, cx - Math.round(w / 2), y, w, 1, color);
    px(ctx, cx, y, Math.round(w / 2), 1, shade);
  }
}

function snowCap(ctx: Ctx, cx: number, top: number, rows: number) {
  for (let i = 0; i < rows; i += 1) {
    const w = 3 + i * 2;
    px(ctx, cx - Math.floor(w / 2), top + i, w, 1, i > rows - 3 ? C.nieveSombra : C.nieve);
  }
  px(ctx, cx - Math.floor(rows / 2) - 1, top + rows, 2, 3, C.nieve);
  px(ctx, cx + Math.floor(rows / 2) - 1, top + rows, 2, 4, C.nieve);
  px(ctx, cx - 1, top + rows, 2, 2, C.nieveSombra);
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
  const W = SKY.w / P; // 400
  const H = SKY.h / P; // 80

  const alto = Math.ceil(H / C.cielo.length);
  C.cielo.forEach((c, i) => px(ctx, 0, i * alto, W, alto, c));

  // Estrellas: posiciones fijas, no aleatorias, para que no parpadeen al
  // repintar y para que la escena sea siempre la misma.
  const estrellas = [
    [14, 6], [31, 12], [48, 4], [63, 16], [79, 9], [95, 3], [112, 14], [129, 7],
    [146, 18], [162, 5], [178, 13], [196, 8], [213, 2], [229, 15], [246, 6],
    [262, 11], [279, 4], [295, 17], [311, 9], [328, 3], [344, 13], [361, 7],
    [377, 15], [392, 5], [22, 22], [57, 26], [104, 24], [188, 28], [272, 23], [356, 27],
  ];
  for (const [x, y] of estrellas) px(ctx, x, y, 1, 1, C.estrella);
  for (const [x, y] of [[48, 4], [196, 8], [311, 9]]) {
    px(ctx, x - 1, y, 3, 1, C.estrella);
    px(ctx, x, y - 1, 1, 3, C.estrella);
  }

  // Luna
  px(ctx, 330, 10, 10, 10, C.luna);
  px(ctx, 329, 12, 1, 6, C.luna);
  px(ctx, 340, 12, 1, 6, C.luna);
  px(ctx, 332, 12, 2, 2, C.lunaSombra);
  px(ctx, 336, 16, 3, 2, C.lunaSombra);

  // Nubes muy tenues
  const nube = (x: number, y: number) => {
    px(ctx, x, y, 14, 3, C.nube);
    px(ctx, x + 3, y - 2, 8, 2, C.nube);
    px(ctx, x + 7, y - 3, 4, 2, C.nube);
  };
  nube(40, 30);
  nube(250, 26);

  // Chachani, Misti y Pichu Pichu
  mountain(ctx, 78, 78, 74, 40, C.cerro, C.cerroSombra);
  mountain(ctx, 330, 78, 70, 35, C.cerro, C.cerroSombra);
  mountain(ctx, 200, 80, 92, 58, C.volcan, C.volcanSombra);
  snowCap(ctx, 200, 22, 8);
  for (const [x, y, h] of [
    [186, 44, 12],
    [212, 40, 16],
    [196, 58, 9],
    [220, 56, 10],
  ]) {
    px(ctx, x, y, 1, h, C.volcanSombra);
  }

  // ---- Catedral ----
  const cx = 200;
  const fach = cx - 62;
  px(ctx, fach, 52, 124, 28, C.sillar);
  px(ctx, fach, 52, 124, 2, C.sillarClaro);
  px(ctx, fach, 60, 124, 1, C.sillarSombra);

  for (const tx of [fach - 12, fach + 118]) {
    px(ctx, tx, 36, 16, 44, C.sillar);
    px(ctx, tx, 36, 16, 2, C.sillarClaro);
    arch(ctx, tx + 4, 41, 8, 8, C.vanoLuz, C.sillarSombra);
    px(ctx, tx + 1, 32, 14, 4, C.sillarClaro);
    px(ctx, tx + 4, 29, 8, 3, C.sillarClaro);
    px(ctx, tx + 6, 26, 4, 3, C.sillarClaro);
    px(ctx, tx + 7, 23, 2, 3, C.sillarSombra);
  }

  // Arqueria iluminada
  for (let i = 0; i < 8; i += 1) arch(ctx, fach + 5 + i * 15, 62, 11, 18, C.vanoLuz, C.sillarClaro);
  // Portada central
  px(ctx, cx - 11, 46, 22, 34, C.sillarClaro);
  arch(ctx, cx - 8, 50, 16, 30, C.vanoLuz, C.sillar);
  px(ctx, cx - 2, 38, 4, 8, C.sillarClaro);
  px(ctx, cx - 1, 34, 2, 4, C.sillarSombra);

  // ---- Portales ----
  for (const x0 of [2, 286]) {
    px(ctx, x0, 60, 112, 20, C.sillar);
    px(ctx, x0, 60, 112, 2, C.sillarClaro);
    for (let i = 0; i < 10; i += 1) arch(ctx, x0 + 3 + i * 11, 64, 9, 16, C.vanoLuz, C.sillarSombra);
  }
}

/* --------------------------------------------------------------- avion ---- */

/**
 * El avioncito con el cartel. Se dibuja encima del cielo en cada cuadro (no se
 * puede hornear en la capa de fondo porque se mueve), y pasa cada tanto: si
 * estuviera siempre, dejaria de hacer gracia.
 */
export function drawPlane(ctx: Ctx, x: number, y: number) {
  // Cartel
  px(ctx, x + 14, y - 3, 52, 11, "#ea4335");
  px(ctx, x + 14, y - 3, 52, 1, "#ffffff");
  px(ctx, x + 14, y + 7, 52, 1, "#b7271c");
  texto(ctx, "GDG", x + 17, y, "#ffffff");
  texto(ctx, "AREQUIPA", x + 30, y, "#ffffff");
  // Cuerda
  px(ctx, x + 10, y + 2, 4, 1, "#dcdcdc");
  // Avion
  px(ctx, x, y, 11, 3, "#e8e8e8");
  px(ctx, x + 9, y - 1, 2, 2, "#e8e8e8");
  px(ctx, x + 1, y + 3, 5, 1, "#c8c8c8");
  px(ctx, x + 3, y - 2, 4, 2, "#4285f4");
  px(ctx, x, y - 2, 2, 2, "#c8c8c8");
  px(ctx, x + 10, y + 1, 1, 1, "#fbbc04");
}

/* --------------------------------------------------------------- suelo ---- */

function ovalRow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let dy = -ry; dy <= ry; dy += 1) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    if (w <= 0) continue;
    px(ctx, cx - w, cy + dy, w * 2, 1, color);
  }
}

function palm(ctx: Ctx, x: number, baseY: number, alto: number) {
  px(ctx, x, baseY - alto, 2, alto, C.tronco);
  const hoja = (dx: number, dy: number, w: number) => px(ctx, x + dx, baseY - alto + dy, w, 1, C.hoja);
  hoja(-7, -1, 7);
  hoja(-8, 0, 6);
  hoja(2, -1, 7);
  hoja(3, 0, 6);
  hoja(-5, -3, 4);
  hoja(2, -3, 4);
  px(ctx, x - 1, baseY - alto - 2, 4, 2, C.hoja);
}

function banca(ctx: Ctx, x: number, y: number) {
  px(ctx, x, y, 12, 2, C.banca);
  px(ctx, x, y + 2, 12, 1, C.bancaSombra);
  px(ctx, x + 1, y + 3, 2, 2, C.bancaSombra);
  px(ctx, x + 9, y + 3, 2, 2, C.bancaSombra);
}

/** Farol encendido, con su charco de luz en el suelo. */
function farol(ctx: Ctx, x: number, baseY: number) {
  // La luz primero: el poste va encima.
  ovalRow(ctx, x + 1, baseY + 3, 11, 4, C.luzSuelo);
  px(ctx, x, baseY - 13, 2, 13, C.farol);
  px(ctx, x - 2, baseY - 1, 6, 1, C.farol);
  px(ctx, x - 1, baseY - 18, 4, 5, C.luz);
  px(ctx, x - 2, baseY - 19, 6, 1, C.farol);
  px(ctx, x - 1, baseY - 20, 4, 1, C.farol);
  px(ctx, x, baseY - 17, 2, 3, "#fff2c8");
}

export function drawGround(ctx: Ctx) {
  const W = WORLD.w / P; // 450
  const H = WORLD.h / P; // 155
  const top = GROUND_TOP;

  // Baldosas
  for (let y = top; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const tile = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0;
      px(ctx, x, y, 1, 1, tile ? C.piso[0] : C.piso[1]);
    }
  }
  for (let y = top; y < H; y += 6) px(ctx, 0, y, W, 1, C.junta);
  for (let x = 0; x < W; x += 6) px(ctx, x, top, 1, H - top, C.junta);

  // Vereda de arriba
  px(ctx, 0, top, W, 2, C.vereda);
  px(ctx, 0, top + 2, W, 1, C.junta);

  // Camino que cruza por delante de la pileta
  px(ctx, 0, 112, W, 9, C.camino);
  px(ctx, 0, 112, W, 1, C.junta);
  px(ctx, 0, 120, W, 1, C.junta);

  // Jardines, repartidos a lo ancho
  const jardin = (x: number, y: number, jw: number, jh: number) => {
    px(ctx, x, y, jw, jh, C.jardin);
    px(ctx, x, y + jh - 2, jw, 2, C.jardinSombra);
    px(ctx, x, y, jw, 1, C.jardin);
    for (let i = 0; i < jw * jh * 0.05; i += 1) {
      px(ctx, x + ((i * 7) % jw), y + 1 + ((i * 5) % (jh - 3)), 1, 1, C.flor);
    }
    px(ctx, x, y, 1, jh, C.vereda);
    px(ctx, x + jw - 1, y, 1, jh, C.vereda);
  };
  for (const jx of [14, 92, 300, 378]) {
    jardin(jx, 84, 44, 16);
    jardin(jx, 130, 44, 16);
  }

  for (const [x, alto] of [
    [26, 17],
    [48, 13],
    [104, 15],
    [126, 12],
    [312, 16],
    [334, 12],
    [390, 17],
    [412, 13],
  ] as [number, number][]) {
    palm(ctx, x, 84, alto);
  }

  for (const bx of [62, 160, 268, 356]) {
    banca(ctx, bx, 92);
    banca(ctx, bx, 138);
  }

  for (const fx of [78, 150, 300, 372]) farol(ctx, fx, 110);

  // ---- Pileta ----
  const fx = 225;
  const fy = 128;
  ovalRow(ctx, fx, fy, 34, 12, C.piedra);
  ovalRow(ctx, fx, fy, 30, 10, C.piedraClara);
  ovalRow(ctx, fx, fy, 27, 8, C.agua);
  ovalRow(ctx, fx, fy - 1, 22, 6, C.aguaClara);
  px(ctx, fx - 12, fy - 3, 6, 1, C.aguaBrillo);
  px(ctx, fx + 5, fy + 2, 7, 1, C.aguaBrillo);
  px(ctx, fx - 4, fy - 16, 8, 16, C.piedraClara);
  px(ctx, fx - 4, fy - 16, 8, 1, C.piedra);
  ovalRow(ctx, fx, fy - 17, 12, 4, C.piedraClara);
  ovalRow(ctx, fx, fy - 18, 9, 2, C.aguaClara);
  px(ctx, fx - 1, fy - 24, 2, 6, C.piedraClara);
  px(ctx, fx - 3, fy - 25, 6, 1, C.aguaBrillo);
  px(ctx, fx - 8, fy - 22, 1, 4, C.aguaBrillo);
  px(ctx, fx + 7, fy - 22, 1, 4, C.aguaBrillo);
  px(ctx, fx - 6, fy - 20, 1, 3, C.aguaBrillo);
  px(ctx, fx + 5, fy - 20, 1, 3, C.aguaBrillo);
}

/**
 * Los personajes del lobby, dibujados a mano en pixeles.
 *
 * Cada uno es una rejilla de 16x20: el cuerpo son las 16 primeras filas y las
 * piernas van aparte, con dos frames, para que caminar sea cambiar solo las
 * piernas y el cuerpo nunca se desalinee.
 *
 * Cada letra es un color de la paleta y el punto es transparente. Se pintan una
 * sola vez en un canvas aparte y despues solo se copian: dibujar pixel por
 * pixel a 60 fps con decenas de personajes se comeria el celular.
 */

export type SkinId = "characato" | "rocoto" | "toro" | "misti" | "alpaca";

export const SKIN_IDS: SkinId[] = ["characato", "rocoto", "toro", "misti", "alpaca"];

export const SKIN_NAMES: Record<SkinId, string> = {
  characato: "Characato",
  rocoto: "Rocoto",
  toro: "Toro",
  misti: "Misti",
  alpaca: "Alpaca",
};

type Sprite = {
  palette: Record<string, string>;
  /** 16 filas de 16 caracteres. */
  body: string[];
  /** Dos frames de 4 filas: quieto y en movimiento. */
  legs: [string[], string[]];
};

const CHARACATO: Sprite = {
  palette: {
    h: "#f0d08a", // paja del sombrero
    H: "#c9a227", // ala
    b: "#8a6d1b", // cinta
    f: "#e8b98a", // piel
    F: "#cf9c6c", // sombra de la piel
    e: "#1d1d1d",
    m: "#9c4a33", // boca
    p: "#d7342a", // poncho
    P: "#f7f1e6", // franja
    q: "#a3281f", // sombra del poncho
    L: "#2f4858", // pantalon
    B: "#4a2f1b", // zapatos
  },
  body: [
    "................",
    ".....hhhhhh.....",
    "....hhhhhhhh....",
    "....hbbbbbbh....",
    "..HHHHHHHHHHHH..",
    "....ffffffff....",
    "....feffffef....",
    "....ffffffff....",
    "....fFmmmmFf....",
    ".....ffffff.....",
    "...pppppppppp...",
    "..pppppppppppp..",
    "..pPPPPPPPPPPp..",
    "..pppppppppppp..",
    "..qppppppppppq..",
    "...pppppppppp...",
  ],
  legs: [
    ["....LLL..LLL....", "....LLL..LLL....", "...BBBB..BBBB...", "................"],
    ["...LLL....LLL...", "...LLL....LLL...", "..BBBB....BBBB..", "................"],
  ],
};

const ROCOTO: Sprite = {
  palette: {
    r: "#d62828", // rojo
    R: "#9d1c1c", // sombra
    W: "#ff8a7a", // brillo
    g: "#2e7d32", // tallo
    e: "#1d1d1d",
    w: "#ffffff",
    m: "#7a1414", // boca
    L: "#6b3f1d",
  },
  body: [
    "................",
    ".......gg.......",
    "......gggg......",
    ".....ggggg......",
    "...rrrrrrrrrr...",
    "..rrrrrrrrrrrr..",
    ".rrrrrrrrrrrrrr.",
    ".rWrrrrrrrrrrrr.",
    ".rWrrwerrewrrrr.",
    ".rrrrwerrewrrrr.",
    ".rrrrrrrrrrrrrr.",
    ".rrrrrmmmmrrrrr.",
    ".rrrrrrrrrrrrRR.",
    "..rrrrrrrrrrRR..",
    "...rrrrrrrrrr...",
    "....rrrrrrrr....",
  ],
  legs: [
    ["....LL....LL....", "....LL....LL....", "...LLL....LLL...", "................"],
    ["...LL......LL...", "...LL......LL...", "..LLL......LLL..", "................"],
  ],
};

const TORO: Sprite = {
  palette: {
    n: "#4a3b32", // pelaje
    N: "#2f251f", // sombra
    c: "#efe6d2", // cuernos
    e: "#1d1d1d",
    w: "#ffffff",
    p: "#d9a7a7", // hocico
    P: "#8a5a5a", // fosas nasales
    B: "#201914", // pezunas
  },
  body: [
    "................",
    "..c..........c..",
    "..cc........cc..",
    "...cc......cc...",
    "...nnnnnnnnnn...",
    "..nnnnnnnnnnnn..",
    "..nnnnnnnnnnnn..",
    "..nweennnneewn..",
    "..nnnnnnnnnnnn..",
    "...pppppppppp...",
    "...pPpppppppPp..",
    "...pppppppppp...",
    "..nnnnnnnnnnnn..",
    ".nnnnnnnnnnnnnn.",
    ".nnNNNNNNNNNNnn.",
    ".nnnnnnnnnnnnnn.",
  ],
  legs: [
    ["..nnnn....nnnn..", "..nnnn....nnnn..", "..BBBB....BBBB..", "................"],
    [".nnnn......nnnn.", ".nnnn......nnnn.", ".BBBB......BBBB.", "................"],
  ],
};

const MISTI: Sprite = {
  palette: {
    m: "#8d6e63", // ladera
    M: "#5d4037", // sombra
    s: "#ffffff", // nieve
    S: "#d8e4ea", // nieve en sombra
    e: "#1d1d1d",
    w: "#ffffff",
    f: "#cfcfcf", // humo
    L: "#5d4037",
  },
  body: [
    "................",
    ".......ff.......",
    "......ff........",
    ".......ss.......",
    "......ssss......",
    "......ssss......",
    ".....ssssss.....",
    "....ssssssss....",
    "....sSmmmmSs....",
    "...mmmmmmmmmm...",
    "..mmweemmeewmm..",
    "..mmmmmmmmmmmm..",
    ".mmmmmmmmmmmmmm.",
    ".mmmMMMMMMMMmmm.",
    "mmmmmmmmmmmmmmmm",
    "MMMMMMMMMMMMMMMM",
  ],
  legs: [
    ["....LLL..LLL....", "....LLL..LLL....", "...LLLL..LLLL...", "................"],
    ["...LLL....LLL...", "...LLL....LLL...", "..LLLL....LLLL..", "................"],
  ],
};

const ALPACA: Sprite = {
  palette: {
    a: "#f5ecd8", // lana
    A: "#ddcfae", // sombra de la lana
    e: "#1d1d1d",
    m: "#c89a8a", // hocico
    c: "#e4572e", // chullo
    C: "#2a9d8f", // franja del chullo
    L: "#8a7250", // pezunas
  },
  body: [
    "....a......a....",
    ".....cccccc.....",
    "....cCCCCCCc....",
    "....cccccccc....",
    ".....aaaaaa.....",
    ".....aeaaea.....",
    ".....aammaa.....",
    "......aaaa......",
    "......aaaa......",
    "......aaaa......",
    "....aaaaaaaa....",
    "..aaaaaaaaaaaa..",
    ".aaaaaaaaaaaaaa.",
    ".aaAAAAAAAAAAaa.",
    ".aaaaaaaaaaaaaa.",
    "..aaaaaaaaaaaa..",
  ],
  legs: [
    ["...aa......aa...", "...aa......aa...", "...LL......LL...", "................"],
    ["..aa........aa..", "..aa........aa..", "..LL........LL..", "................"],
  ],
};

const SPRITES: Record<SkinId, Sprite> = {
  characato: CHARACATO,
  rocoto: ROCOTO,
  toro: TORO,
  misti: MISTI,
  alpaca: ALPACA,
};

export const SPRITE_W = 16;
export const SPRITE_H = 20;
/** Cada pixel del dibujo son 3x3 del mundo: el personaje mide 48x60. */
export const PIXEL = 3;

/** Avisa en desarrollo si una fila quedo con el ancho equivocado. */
function rowsOf(sprite: Sprite, frame: number): string[] {
  const rows = [...sprite.body, ...sprite.legs[frame % sprite.legs.length]];
  if (process.env.NODE_ENV !== "production") {
    const mala = rows.findIndex((r) => r.length !== SPRITE_W);
    if (mala >= 0) console.warn(`sprite: la fila ${mala} mide ${rows[mala].length}, deberia medir ${SPRITE_W}`);
    if (rows.length !== SPRITE_H) console.warn(`sprite: tiene ${rows.length} filas, deberia tener ${SPRITE_H}`);
  }
  return rows;
}

const cache: Record<string, HTMLCanvasElement> = {};

function paint(skin: SkinId, frame: number, flip: boolean): HTMLCanvasElement {
  const key = `${skin}:${frame}:${flip ? 1 : 0}`;
  const hit = cache[key];
  if (hit) return hit;

  const sprite = SPRITES[skin] ?? SPRITES.characato;
  const rows = rowsOf(sprite, frame);
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_W * PIXEL;
  canvas.height = SPRITE_H * PIXEL;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const color = sprite.palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      const px = flip ? SPRITE_W - 1 - x : x;
      ctx.fillRect(px * PIXEL, y * PIXEL, PIXEL, PIXEL);
    }
  }
  cache[key] = canvas;
  return canvas;
}

/**
 * Dibuja a alguien con los pies en (x, y).
 * dir: 0 abajo, 1 izquierda, 2 arriba, 3 derecha. Izquierda es el mismo dibujo
 * volteado: con 16x20 pixeles no hace falta un juego de sprites por lado.
 */
export function drawSkin(
  ctx: CanvasRenderingContext2D,
  skin: SkinId,
  x: number,
  y: number,
  dir: number,
  frame: number,
) {
  const canvas = paint(skin, frame, dir === 1);
  ctx.drawImage(canvas, Math.round(x - canvas.width / 2), Math.round(y - canvas.height));
}

export const skinOf = (value: string | null | undefined): SkinId =>
  SKIN_IDS.includes(value as SkinId) ? (value as SkinId) : "characato";

/**
 * Los personajes del lobby, dibujados a mano en pixeles.
 *
 * Cada frame es una rejilla de 12x16 donde cada letra es un color de la
 * paleta y el punto es transparente. Se pintan una sola vez en un canvas
 * aparte y despues solo se copian: dibujar pixel por pixel a 60 fps con 60
 * personajes en pantalla se comeria el celular.
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

type Sprite = { palette: Record<string, string>; frames: string[][] };

const CHARACATO: Sprite = {
  palette: {
    h: "#c9a227", // paja del sombrero
    H: "#8a6d1b", // ala
    f: "#e8b98a", // piel
    e: "#1d1d1d",
    p: "#d7342a", // poncho
    P: "#f2f2f2", // franja del poncho
    L: "#2f4858", // pantalon
    B: "#4a2f1b", // zapatos
  },
  frames: [
    [
      "............",
      "...hhhhhh...",
      "..hhhhhhhh..",
      ".HHHHHHHHHH.",
      "...ffffff...",
      "...fefeef...",
      "...ffffff...",
      "..pppppppp..",
      ".ppPPPPPPpp.",
      ".ppPPPPPPpp.",
      ".pppppppppp.",
      "..pppppppp..",
      "...LL..LL...",
      "...LL..LL...",
      "..BB....BB..",
      "............",
    ],
    [
      "............",
      "...hhhhhh...",
      "..hhhhhhhh..",
      ".HHHHHHHHHH.",
      "...ffffff...",
      "...fefeef...",
      "...ffffff...",
      "..pppppppp..",
      ".ppPPPPPPpp.",
      ".ppPPPPPPpp.",
      ".pppppppppp.",
      "..pppppppp..",
      "..LL....LL..",
      "..LL....LL..",
      ".BB......BB.",
      "............",
    ],
  ],
};

const ROCOTO: Sprite = {
  palette: {
    r: "#d62828", // rojo del rocoto
    R: "#9d1c1c", // sombra
    g: "#2e7d32", // tallo
    e: "#1d1d1d",
    w: "#ffffff",
    L: "#6b3f1d",
  },
  frames: [
    [
      "............",
      ".....gg.....",
      "....gggg....",
      "..rrrrrrrr..",
      ".rrrrrrrrrr.",
      "rrrrrrrrrrrr",
      "rrweerrweerr",
      "rrweerrweerr",
      "rrrrrrrrrrrr",
      "rrrRRrrRRrrr",
      "rrrrRRRRrrrr",
      ".rrrrrrrrrr.",
      "..rrrrrrrr..",
      "...rrrrrr...",
      "...LL..LL...",
      "............",
    ],
    [
      "............",
      ".....gg.....",
      "....gggg....",
      "..rrrrrrrr..",
      ".rrrrrrrrrr.",
      "rrrrrrrrrrrr",
      "rrweerrweerr",
      "rrweerrweerr",
      "rrrrrrrrrrrr",
      "rrrRRrrRRrrr",
      "rrrrRRRRrrrr",
      ".rrrrrrrrrr.",
      "..rrrrrrrr..",
      "...rrrrrr...",
      "..LL....LL..",
      "............",
    ],
  ],
};

const TORO: Sprite = {
  palette: {
    n: "#2b2b2b", // cuerpo
    N: "#141414", // sombra
    c: "#e9e2d0", // cuernos
    e: "#f2f2f2",
    p: "#d9a7a7", // hocico
    L: "#141414",
  },
  frames: [
    [
      "cc........cc",
      ".cc......cc.",
      "..nnnnnnnn..",
      ".nnnnnnnnnn.",
      ".nneennneen.",
      ".nnnnnnnnnn.",
      "..nnppppnn..",
      "...pppppp...",
      "..nnnnnnnn..",
      ".nnnnnnnnnn.",
      ".nnNNNNNNnn.",
      ".nnnnnnnnnn.",
      "..nnnnnnnn..",
      "...LL..LL...",
      "...LL..LL...",
      "............",
    ],
    [
      "cc........cc",
      ".cc......cc.",
      "..nnnnnnnn..",
      ".nnnnnnnnnn.",
      ".nneennneen.",
      ".nnnnnnnnnn.",
      "..nnppppnn..",
      "...pppppp...",
      "..nnnnnnnn..",
      ".nnnnnnnnnn.",
      ".nnNNNNNNnn.",
      ".nnnnnnnnnn.",
      "..nnnnnnnn..",
      "..LL....LL..",
      "..LL....LL..",
      "............",
    ],
  ],
};

const MISTI: Sprite = {
  palette: {
    m: "#8d6e63", // ladera
    M: "#5d4037", // sombra
    s: "#ffffff", // nieve
    e: "#1d1d1d",
    f: "#ff7043", // humito
    L: "#5d4037",
  },
  frames: [
    [
      "....ffff....",
      ".....ff.....",
      "...ssssss...",
      "..ssssssss..",
      "..smmmmmms..",
      "..mmmmmmmm..",
      "..mmeemmee..",
      ".mmmmmmmmmm.",
      ".mmmmmmmmmm.",
      "mmmMMmmmMMmm",
      "mmmmmmmmmmmm",
      "mmmmmmmmmmmm",
      "MMMMMMMMMMMM",
      "...LL..LL...",
      "...LL..LL...",
      "............",
    ],
    [
      ".....ff.....",
      "....ffff....",
      "...ssssss...",
      "..ssssssss..",
      "..smmmmmms..",
      "..mmmmmmmm..",
      "..mmeemmee..",
      ".mmmmmmmmmm.",
      ".mmmmmmmmmm.",
      "mmmMMmmmMMmm",
      "mmmmmmmmmmmm",
      "mmmmmmmmmmmm",
      "MMMMMMMMMMMM",
      "..LL....LL..",
      "..LL....LL..",
      "............",
    ],
  ],
};

const ALPACA: Sprite = {
  palette: {
    a: "#f3e9d2", // lana
    A: "#d9c9a3", // sombra
    e: "#1d1d1d",
    c: "#e4572e", // chullo
    C: "#2a9d8f", // franja del chullo
    L: "#8a7250",
  },
  frames: [
    [
      "....cccc....",
      "...cCCCCc...",
      "...cccccc...",
      "....aaaa....",
      "....aeea....",
      "....aaaa....",
      "....aaaa....",
      "..aaaaaaaa..",
      ".aaaaaaaaaa.",
      ".aaAAAAAAaa.",
      ".aaaaaaaaaa.",
      ".aaaaaaaaaa.",
      "..aaaaaaaa..",
      "...LL..LL...",
      "...LL..LL...",
      "............",
    ],
    [
      "....cccc....",
      "...cCCCCc...",
      "...cccccc...",
      "....aaaa....",
      "....aeea....",
      "....aaaa....",
      "....aaaa....",
      "..aaaaaaaa..",
      ".aaaaaaaaaa.",
      ".aaAAAAAAaa.",
      ".aaaaaaaaaa.",
      ".aaaaaaaaaa.",
      "..aaaaaaaa..",
      "..LL....LL..",
      "..LL....LL..",
      "............",
    ],
  ],
};

const SPRITES: Record<SkinId, Sprite> = {
  characato: CHARACATO,
  rocoto: ROCOTO,
  toro: TORO,
  misti: MISTI,
  alpaca: ALPACA,
};

export const SPRITE_W = 12;
export const SPRITE_H = 16;
/** Cada pixel del dibujo son 3x3 pixeles del mundo: el personaje mide 36x48. */
export const PIXEL = 3;

type Cache = Record<string, HTMLCanvasElement>;
const cache: Cache = {};

function paint(skin: SkinId, frame: number, flip: boolean): HTMLCanvasElement {
  const key = `${skin}:${frame}:${flip ? 1 : 0}`;
  const hit = cache[key];
  if (hit) return hit;

  const sprite = SPRITES[skin] ?? SPRITES.characato;
  const rows = sprite.frames[frame % sprite.frames.length];
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
 * volteado: son 12x16 pixeles, no hace falta un juego de sprites por lado.
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

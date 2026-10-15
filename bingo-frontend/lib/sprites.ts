/**
 * Los personajes del lobby, dibujados a mano en pixeles.
 *
 * Todos son gente de la comunidad: polera negra con el logo de GDG en el
 * pecho y jean, que es el uniforme real de un evento de devs. El mago, el
 * esqueleto y el robot son el mismo cuerpo con otra cabeza: asi todos se ven
 * de la misma familia aunque cada uno tenga su chiste.
 *
 * Cada uno es una rejilla de 16x20: el cuerpo son las 16 primeras filas y las
 * piernas van aparte, con dos frames, para que caminar sea cambiar solo las
 * piernas y el cuerpo nunca se desalinee.
 */

export type SkinId = "dev" | "lead" | "mago" | "esqueleto" | "robot";

export const SKIN_IDS: SkinId[] = ["dev", "lead", "mago", "esqueleto", "robot"];

export const SKIN_NAMES: Record<SkinId, string> = {
  dev: "Dev",
  lead: "Tech lead",
  mago: "Mago",
  esqueleto: "Esqueleto",
  robot: "Bot",
};

type Sprite = {
  palette: Record<string, string>;
  /** 16 filas de 16 caracteres. */
  body: string[];
  /** Dos frames de 4 filas: quieto y en movimiento. */
  legs: [string[], string[]];
};

/** Colores que comparten todos: la polera negra con el logo y el jean. */
const COMUN = {
  s: "#1f1f24", // polera negra
  S: "#15151a", // sombra de la polera
  r: "#ea4335", // logo GDG
  b: "#4285f4",
  g: "#34a853",
  y: "#fbbc04",
  j: "#3f5f8c", // jean
  J: "#31496e",
  z: "#e4e4e4", // zapatillas
};

/** El torso con el logo, igual para todos. */
const TORSO = [
  "..ssssssssssss..",
  ".ssssssssssssss.",
  ".ssssrrssggssss.",
  ".sssbbssssyysss.",
  ".ssssssssssssss.",
  "..SssssssssssS..",
];

const PIERNAS: [string[], string[]] = [
  ["...jjjj..jjjj...", "...jjjj..jjjj...", "...zzzz..zzzz...", "................"],
  ["..jjjj....jjjj..", "..jjjj....jjjj..", "..zzzz....zzzz..", "................"],
];

const DEV: Sprite = {
  palette: {
    ...COMUN,
    p: "#e8b98a", // piel
    P: "#c99a6b",
    h: "#241c18", // pelo
    H: "#3b2e26",
    e: "#1d1d1d",
  },
  body: [
    "................",
    "....hhhhhhhh....",
    "...hhhhhhhhhh...",
    "...hhppppppph...",
    "...hpppppppph...",
    "...pppppppppp...",
    "...pepppppppe...",
    "...pppppppppp...",
    "....pPPPPPPp....",
    ".....pppppp.....",
    ...TORSO,
  ],
  legs: PIERNAS,
};

const LEAD: Sprite = {
  palette: {
    ...COMUN,
    p: "#e3b183",
    P: "#c2905f",
    h: "#2b1d17", // pelo largo
    H: "#432f24",
    e: "#1d1d1d",
  },
  body: [
    "................",
    "....hhhhhhhh....",
    "..hhhhhhhhhhhh..",
    "..hhhhhhhhhhhh..",
    "..hhpppppppphh..",
    "..hhpppppppphh..",
    "..hhpeppppephh..",
    "..hhpppppppphh..",
    "..hhpPPPPPPphh..",
    "...hpppppppph...",
    ".hssssssssssssh.",
    ".hssssssssssssh.",
    ".ssssrrssggssss.",
    ".sssbbssssyysss.",
    ".ssssssssssssss.",
    "..SssssssssssS..",
  ],
  legs: PIERNAS,
};

const MAGO: Sprite = {
  palette: {
    ...COMUN,
    m: "#5b3b8c", // tunica
    M: "#452c6b",
    p: "#e8b98a",
    P: "#c99a6b",
    w: "#eceff4", // barba
    W: "#c7ccd6",
    e: "#1d1d1d",
    a: "#fbbc04", // estrella del sombrero
  },
  body: [
    "......mm........",
    ".....mmmm.......",
    "....mmmamm......",
    "...mmmmmmmm.....",
    "..MMMMMMMMMMM...",
    "....pppppppp....",
    "....peppppep....",
    "....pppppppp....",
    "...wwwwwwwwww...",
    "....wWWWWWWw....",
    "..mmmmmmmmmmmm..",
    ".mmmmmmmmmmmmmm.",
    ".mmmmrrmmggmmmm.",
    ".mmmbbmmmmyymmm.",
    ".mmmmmmmmmmmmmm.",
    "..MmmmmmmmmmmM..",
  ],
  legs: [
    ["...mmmm..mmmm...", "...mmmm..mmmm...", "...zzzz..zzzz...", "................"],
    ["..mmmm....mmmm..", "..mmmm....mmmm..", "..zzzz....zzzz..", "................"],
  ],
};

const ESQUELETO: Sprite = {
  palette: {
    ...COMUN,
    o: "#ece7d9", // hueso
    O: "#c9c3b2",
    e: "#15151a",
    c: "#9fe8ff", // chispita en la cuenca
  },
  body: [
    "................",
    "....oooooooo....",
    "...oooooooooo...",
    "...oooooooooo...",
    "...oeeooooeeo...",
    "...oceooooceo...",
    "...oooooooooo...",
    "....oooooooo....",
    "....oOoOoOoo....",
    ".....oooooo.....",
    ...TORSO,
  ],
  legs: PIERNAS,
};

const ROBOT: Sprite = {
  palette: {
    ...COMUN,
    m: "#9aa3ad", // carcasa
    M: "#6f7985",
    v: "#10182a", // pantalla
    c: "#4dd0e1",
    a: "#ea4335", // antena
  },
  body: [
    "......aa........",
    "......mm........",
    "...mmmmmmmmmm...",
    "..mmmmmmmmmmmm..",
    "..mmvvvvvvvvmm..",
    "..mmvccvvccvmm..",
    "..mmvvvvvvvvmm..",
    "..mmvvcccccvmm..",
    "..MMMMMMMMMMMM..",
    "....mmmmmmmm....",
    ...TORSO,
  ],
  legs: PIERNAS,
};

const SPRITES: Record<SkinId, Sprite> = {
  dev: DEV,
  lead: LEAD,
  mago: MAGO,
  esqueleto: ESQUELETO,
  robot: ROBOT,
};

export const SPRITE_W = 16;
export const SPRITE_H = 20;
/**
 * Cada pixel del dibujo son 2x2 del mundo: el personaje mide 32x40. Chico a
 * proposito: en la plaza tienen que entrar cientos sin taparse entre si.
 */
export const PIXEL = 2;

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

  const sprite = SPRITES[skin] ?? SPRITES.dev;
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
  SKIN_IDS.includes(value as SkinId) ? (value as SkinId) : "dev";

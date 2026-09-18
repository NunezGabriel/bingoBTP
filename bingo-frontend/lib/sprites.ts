/**
 * Arte 8-bit de Misti Quest.
 *
 * Cada sprite es una matriz de 16x16 caracteres. Cada caracter apunta a un
 * color de la paleta; "." es transparente. Las letras P/Q/L son el color de la
 * casa del jugador (azul, rojo, amarillo o verde), asi un mismo personaje
 * cambia de color sin redibujarlo.
 */

export type HouseKey = "azul" | "rojo" | "amarillo" | "verde";

export type ClassKey =
  | "esqueleto"
  | "mago"
  | "caballero"
  | "robot"
  | "ninja"
  | "fantasma"
  | "slime"
  | "astronauta"
  | "dragon"
  | "misti";

export type SpriteDef = {
  key: ClassKey;
  name: string;
  lore: string;
  /** Nivel minimo para poder elegirlo. 1 = disponible desde el inicio. */
  unlockLevel: number;
  rows: string[];
};

export const SPRITE_SIZE = 16;

/** Colores fijos, compartidos por todos los sprites. */
const BASE_PALETTE: Record<string, string> = {
  K: "#14142b", // contorno
  W: "#f7f5ef", // blanco / hueso
  w: "#bfc3cf", // sombra del blanco
  G: "#6e7385", // gris medio
  g: "#434757", // gris oscuro
  S: "#f4c49c", // piel
  s: "#cf946b", // sombra de piel
  Y: "#ffd23f", // oro
  y: "#c99a14", // oro oscuro
  R: "#ea4335", // rojo fijo (lengua, lava)
  O: "#ff8a1f", // naranja (lava)
  B: "#9fd8ff", // vidrio / visor claro
  b: "#3b6ea8", // vidrio oscuro
  N: "#7a4a2a", // madera
  n: "#4d2e1a", // madera oscura
  E: "#14142b", // ojos
};

export const HOUSES: Record<
  HouseKey,
  { name: string; P: string; Q: string; L: string }
> = {
  azul: { name: "Azul", P: "#4285f4", Q: "#2657b8", L: "#a3c4fb" },
  rojo: { name: "Rojo", P: "#ea4335", Q: "#a8261b", L: "#f5a39b" },
  amarillo: { name: "Amarillo", P: "#fbbc04", Q: "#b98700", L: "#fde39a" },
  verde: { name: "Verde", P: "#34a853", Q: "#1d7438", L: "#9ad7ab" },
};

export const HOUSE_KEYS = Object.keys(HOUSES) as HouseKey[];

export function paletteFor(house: HouseKey): Record<string, string> {
  const h = HOUSES[house] ?? HOUSES.azul;
  return { ...BASE_PALETTE, P: h.P, Q: h.Q, L: h.L };
}

export const CLASSES: SpriteDef[] = [
  {
    key: "esqueleto",
    name: "Esqueleto",
    lore: "Murio debuggeando en produccion. Volvio para cerrar el ticket.",
    unlockLevel: 1,
    rows: [
      "................",
      ".....KKKKKK.....",
      "...KKWWWWWWKK...",
      "..KWWWWWWWWWWK..",
      "..KWWWWWWWWWwK..",
      ".KWWKKKWWKKKWwK.",
      ".KWWKPKWWKPKWwK.",
      ".KWWKKKWWKKKWwK.",
      "..KWWWWKKWWWwK..",
      "...KWKWKWKWKwK..",
      "....KKKKKKKKK...",
      "...KQPPPPPPPQK..",
      "..KWKPLPPPPPKWK.",
      "..KwKWKWKWKWKwK.",
      "....KWK..KWK....",
      "...KKK....KKK...",
    ],
  },
  {
    key: "mago",
    name: "Mago",
    lore: "Convierte cafe en codigo. A veces el hechizo compila.",
    unlockLevel: 1,
    rows: [
      ".......KK.......",
      "......KPPK......",
      "......KPLK......",
      ".....KPPPQK.....",
      ".....KPYPQK.....",
      "....KPPPPPQK....",
      "..KKKKKKKKKKKK..",
      "...KSSSSSSSSK...",
      "...KSEKSSKESK..Y",
      "...KWSSSSSSWK.KY",
      "...KWWWWWWWWK.N.",
      "..KPKWWWWWWKPKN.",
      "..KPPKWWWWKPPNK.",
      "..KQPPKWWKPPPK..",
      "..KQQPPPPPPQQK..",
      "...KKKKKKKKKK...",
    ],
  },
  {
    key: "caballero",
    name: "Caballero",
    lore: "Juro proteger la rama main de los force push.",
    unlockLevel: 1,
    rows: [
      "......KPK.......",
      ".....KPLPK......",
      "....KKKPKKK.....",
      "...KGWWWWWGK....",
      "...KGWWWWWGK....",
      "...KKKKKKKKK..K.",
      "...KGBKKKBGK.KW.",
      "...KGWWWWWGK.KW.",
      "....KGGGGGK..KW.",
      "..KKGKPPPKGKKKW.",
      ".KGWKPPLPPKWGKY.",
      ".KGWKPPPPPKWKYK.",
      "..KKKQPPPQKKK...",
      "....KGGKGGK.....",
      "....KgK.KgK.....",
      "...KKK...KKK....",
    ],
  },
  {
    key: "robot",
    name: "Robot",
    lore: "Paso el test de Turing. No paso el de CSS centrado.",
    unlockLevel: 1,
    rows: [
      ".......KK.......",
      ".......KRK......",
      "........K.......",
      "....KKKKKKKK....",
      "...KWWWWWWWWK...",
      "..KKWKKKKKKWKK..",
      "..KGWKBEBBEKWGK.",
      "..KKWKKKKKKWKK..",
      "...KWwWKKWwWK...",
      "....KKKKKKKK....",
      "..KKGPPPPPPGKK..",
      ".KWKGPYPPYPGKWK.",
      ".KGKGPPPPPPGKGK.",
      "..KKGQQQQQQGKK..",
      "....KGK..KGK....",
      "...KKKK..KKKK...",
    ],
  },
  {
    key: "ninja",
    name: "Ninja",
    lore: "Hace deploy un viernes a las 5pm y nadie lo ve venir.",
    unlockLevel: 1,
    rows: [
      "................",
      ".....KKKKKK.....",
      "....KggggggK....",
      "...KggggggggK...",
      "...KPPPPPPPPKPK.",
      "...KSSSSSSSSKLPK",
      "...KSEESSEESK.KP",
      "...KggggggggK...",
      "....KggggggK....",
      "...KKKPPPPKKK...",
      "..KgKgggggggKgK.",
      "..KgKgggggggKSK.",
      "...KKQPPPPQKKK..",
      "....KggKKggK....",
      "....KgK..KgK....",
      "...KKK....KKK...",
    ],
  },
  {
    key: "fantasma",
    name: "Fantasma",
    lore: "Aparece en tus logs a las 3am. Nadie sabe de donde viene.",
    unlockLevel: 1,
    rows: [
      "................",
      "......KKKK......",
      "....KKWWWWKK....",
      "...KWWWWWWWWK...",
      "..KWWWWWWWWWwK..",
      "..KWWKKWWKKWwK..",
      "..KWWKEWWKEWwK..",
      "..KWLWWWWWWLwK..",
      ".KWWWWWKKWWWWwK.",
      "KWKWWWWWWWWWKwK.",
      "KK.KPPPPPPPPK.K.",
      "...KWWWWWWWwK...",
      "...KWWWWWWWwK...",
      "..KWWWWWWWWwK...",
      "..KWKWWKWWKwK...",
      "...K.KK.KK.K....",
    ],
  },
  {
    key: "slime",
    name: "Slime",
    lore: "Absorbe todos los stickers del evento. Todos.",
    unlockLevel: 1,
    rows: [
      "................",
      "................",
      "................",
      "................",
      "......KKKK......",
      "....KKPPPPKK....",
      "...KPPWWPPPPK...",
      "..KPPWLPPPPPPK..",
      "..KPPPPPPPPPPK..",
      ".KPPPKEPPKEPPPK.",
      ".KPPPKEPPKEPPPK.",
      ".KPPPPPKKPPPPQK.",
      ".KQPPPPPPPPPPQK.",
      ".KQQPPPPPPPPQQK.",
      "..KKQQQQQQQQKK..",
      "....KKKKKKKK....",
    ],
  },
  {
    key: "astronauta",
    name: "Astronauta",
    lore: "Viene de la nube. Literalmente, trabaja en cloud.",
    unlockLevel: 1,
    rows: [
      "................",
      ".....KKKKKK.....",
      "...KKWWWWWWKK...",
      "..KWWWWWWWWWwK..",
      "..KWKKKKKKKKwK..",
      ".KWKbbBbbbbbKwK.",
      ".KWKbBbbbbbbKwK.",
      ".KWKbbbbbbbbKwK.",
      "..KWKKKKKKKKwK..",
      "...KKWWWWWWKK...",
      "..KGKWPPPPWKGK..",
      ".KWWKWPYYPWKWwK.",
      ".KWKKWWWWWWKKwK.",
      "....KWWKKWwK....",
      "....KWwK.KwK....",
      "...KKKK..KKKK...",
    ],
  },
  {
    key: "dragon",
    name: "Dragon",
    lore: "Legendario. Dicen que sobrevivio a tres DevFest seguidos.",
    unlockLevel: 6,
    rows: [
      "..KK........KK..",
      "..KYK......KYK..",
      "...KYKKKKKKYK...",
      "...KPPPPPPPPK...",
      "..KPPPPPPPPPPK..",
      "..KPYEPPPPEYPK..",
      "..KPYYPPPPYYPK..",
      "..KPPLLLLLLPPK..",
      "...KLKLLLLKLK...",
      "KK..KWKRRKWK..KK",
      "KLK..KPPPPK..KLK",
      "KLLKKPLLLLPKKLLK",
      ".KLKPPLLLLPPKLK.",
      "..KKQPLLLLPQKK..",
      "....KPK..KPK....",
      "...KKKK..KKKK...",
    ],
  },
  {
    key: "misti",
    name: "Misti",
    lore: "Espiritu del volcan. Solo despierta para las verdaderas leyendas.",
    unlockLevel: 10,
    rows: [
      ".....R.OO.R.....",
      "......ROYOR.....",
      ".......OYO......",
      "......KWWWK.....",
      ".....KWWWWWK....",
      "....KWWWWWWwK...",
      "....KGGGGGGGK...",
      "...KGGGGGGGGGK..",
      "...KGGKEGGKEGK..",
      "..KGGGKEGGKEGGK.",
      "..KGGGGGRRGGGgK.",
      ".KGGPPGGGGGPPGgK",
      ".KGPPPGGGGGGPPgK",
      "KgGGGGGGGGGGGGgK",
      "KggggggggggggggK",
      ".KKKKKKKKKKKKKK.",
    ],
  },
];

export const CLASS_BY_KEY = Object.fromEntries(
  CLASSES.map((c) => [c.key, c]),
) as Record<ClassKey, SpriteDef>;

/**
 * Convierte un sprite en rectangulos, uniendo pixeles contiguos del mismo
 * color en cada fila para que el SVG tenga pocos nodos.
 */
export function spriteRects(
  rows: string[],
  palette: Record<string, string>,
): { x: number; y: number; w: number; fill: string }[] {
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === "." || !palette[ch]) {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end += 1;
      rects.push({ x, y, w: end - x, fill: palette[ch] });
      x = end;
    }
  });
  return rects;
}

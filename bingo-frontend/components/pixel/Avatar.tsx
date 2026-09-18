import { TIER_STYLE, type TierKey } from "@/lib/progression";
import { HOUSES, type ClassKey, type HouseKey } from "@/lib/sprites";
import { Sprite } from "./Sprite";

/**
 * Particulas del aura en una grilla de 24x24 (el personaje ocupa 4..20).
 * Dos cuadros que se alternan dan el parpadeo de "fuego" 8-bit.
 */
const FRAME_A: [number, number][] = [
  [7, 2], [12, 1], [17, 2], [2, 8], [1, 13], [2, 18], [22, 8], [23, 13], [22, 18],
  [6, 22], [12, 23], [18, 22], [4, 4], [20, 4], [4, 20], [20, 20],
];
const FRAME_B: [number, number][] = [
  [9, 1], [15, 1], [3, 6], [1, 10], [3, 16], [21, 6], [23, 10], [21, 16],
  [9, 23], [15, 23], [5, 2], [19, 2], [0, 15], [23, 4],
];
const SPARKLES: [number, number][] = [
  [3, 2], [20, 1], [0, 19], [22, 21],
];

const DENSITY: Record<TierKey, number> = {
  madera: 0,
  bronce: 0.55,
  plata: 1,
  oro: 1,
  diamante: 1,
  mitico: 1,
};

export function Aura({ tier, size }: { tier: TierKey; size: number }) {
  const style = TIER_STYLE[tier];
  if (!style.aura) return null;
  const rainbow = style.aura === "rainbow";
  const color = rainbow ? "#4285f4" : style.aura;
  const take = (frame: [number, number][]) =>
    frame.slice(0, Math.ceil(frame.length * DENSITY[tier]));
  const big = tier === "oro" || tier === "diamante" || tier === "mitico";

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden
      className={`absolute inset-0 ${rainbow ? "px-rainbow" : ""}`}
    >
      {/* halo escalonado detras del personaje */}
      <rect x={5} y={3} width={14} height={18} fill={color} opacity={big ? 0.22 : 0.14} />
      <rect x={3} y={5} width={18} height={14} fill={color} opacity={big ? 0.22 : 0.14} />
      <g className="px-aura-a">
        {take(FRAME_A).map(([x, y]) => (
          <rect key={`a${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
        ))}
      </g>
      <g className="px-aura-b">
        {take(FRAME_B).map(([x, y]) => (
          <rect key={`b${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
        ))}
      </g>
      {(tier === "diamante" || tier === "mitico") && (
        <g className="px-aura-a">
          {SPARKLES.map(([x, y]) => (
            <g key={`s${x}-${y}`} fill="#ffffff">
              <rect x={x} y={y + 1} width={3} height={1} />
              <rect x={x + 1} y={y} width={1} height={3} />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

/** Medalla pixel 12x12 segun el rango. */
export function Medal({ tier, size = 24, house = "azul" }: { tier: TierKey; size?: number; house?: HouseKey }) {
  const style = TIER_STYLE[tier];
  const ribbon = HOUSES[house]?.P ?? "#4285f4";
  const rows = [
    "..RR....RR..",
    "...RR..RR...",
    "....RRRR....",
    "....KKKK....",
    "...KMMMMK...",
    "..KMMLLMMK..",
    "..KMLMMMMK..",
    "..KMMMMMDK..",
    "..KMMMMDDK..",
    "...KMDDDK...",
    "....KKKK....",
  ];
  const colors: Record<string, string> = {
    R: ribbon,
    K: "#14142b",
    M: style.medal,
    D: style.medalShade,
    L: "#ffffff",
  };
  return (
    <svg
      viewBox="0 0 12 11"
      width={size}
      height={(size * 11) / 12}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Medalla ${style.label}`}
      className={tier === "mitico" ? "px-rainbow" : undefined}
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={colors[ch]} />
          ),
        ),
      )}
    </svg>
  );
}

/** Personaje con su aura. El aura crece con el rango (nivel). */
export function Avatar({
  cls,
  house,
  tier = "madera",
  size = 96,
  bob = false,
  className = "",
}: {
  cls: ClassKey;
  house: HouseKey;
  tier?: TierKey;
  size?: number;
  bob?: boolean;
  className?: string;
}) {
  const spriteSize = Math.round((size * 16) / 24);
  const offset = Math.round((size * 4) / 24);
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Aura tier={tier} size={size} />
      <div
        className={`absolute ${bob ? "px-bob" : ""}`}
        style={{ left: offset, top: offset, ["--bob" as string]: `${Math.max(2, Math.round(size / 24))}px` }}
      >
        <Sprite cls={cls} house={house} size={spriteSize} />
      </div>
    </div>
  );
}

/** Etiqueta de nivel "NV 7". */
export function LevelTag({ level, className = "" }: { level: number; className?: string }) {
  return (
    <span
      className={`font-pixel inline-block bg-ink px-1.5 pb-[3px] pt-[5px] text-[8px] text-gold ${className}`}
    >
      NV {level}
    </span>
  );
}

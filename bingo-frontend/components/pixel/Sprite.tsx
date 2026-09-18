import { memo } from "react";
import {
  CLASS_BY_KEY,
  paletteFor,
  spriteRects,
  type ClassKey,
  type HouseKey,
} from "@/lib/sprites";
import { ICONS, type IconName } from "./icons";

/** Personaje 16x16 dibujado con rectangulos nitidos (sin antialias). */
export const Sprite = memo(function Sprite({
  cls,
  house,
  size = 64,
  className = "",
  title,
}: {
  cls: ClassKey;
  house: HouseKey;
  size?: number;
  className?: string;
  title?: string;
}) {
  const def = CLASS_BY_KEY[cls] ?? CLASS_BY_KEY.esqueleto;
  const rects = spriteRects(def.rows, paletteFor(house));
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title ?? def.name}
      className={className}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
});

/** Icono pixel 9x9 que hereda el color del texto. */
export function PixelIcon({
  name,
  size = 18,
  className = "",
  label,
}: {
  name: IconName;
  size?: number;
  className?: string;
  label?: string;
}) {
  const rows = ICONS[name];
  const rects: { x: number; y: number; w: number }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== "#") {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === "#") end += 1;
      rects.push({ x, y, w: end - x });
      x = end;
    }
  });
  return (
    <svg
      viewBox="0 0 9 9"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`inline-block shrink-0 ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}

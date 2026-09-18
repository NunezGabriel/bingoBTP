"use client";

import { useMemo } from "react";
import QRCode from "qrcode";

/** QR dibujado con rectangulos, igual que los sprites: nitido a cualquier tamano. */
export function QrCode({
  value,
  size = 220,
  fg = "#14142b",
  bg = "#f7f3e8",
  className = "",
}: {
  value: string;
  size?: number;
  fg?: string;
  bg?: string;
  className?: string;
}) {
  const { rects, total } = useMemo(() => {
    const matrix = QRCode.create(value, { errorCorrectionLevel: "M" }).modules;
    const n = matrix.size;
    const margin = 2;
    const out: { x: number; y: number; w: number }[] = [];
    for (let row = 0; row < n; row += 1) {
      let col = 0;
      while (col < n) {
        if (!matrix.get(row, col)) {
          col += 1;
          continue;
        }
        let end = col + 1;
        while (end < n && matrix.get(row, end)) end += 1;
        out.push({ x: col + margin, y: row + margin, w: end - col });
        col = end;
      }
    }
    return { rects: out, total: n + margin * 2 };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Codigo QR"
      className={className}
    >
      <rect width={total} height={total} fill={bg} />
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={fg} />
      ))}
    </svg>
  );
}

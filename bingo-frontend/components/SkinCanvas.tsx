"use client";

import { useEffect, useRef } from "react";
import { drawSkin, skinOf, SPRITE_H, SPRITE_W, PIXEL } from "@/lib/sprites";

/** Un personaje suelto, para elegirlo o para mostrarlo en una ficha. */
export function SkinCanvas({
  skin,
  zoom = 2,
  walking = false,
}: {
  skin: string | null | undefined;
  zoom?: number;
  walking?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = SPRITE_W * PIXEL * zoom;
  const h = SPRITE_H * PIXEL * zoom;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    let raf = 0;
    const paint = (now: number) => {
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      const frame = walking ? Math.floor((now / 220) % 2) : 0;
      drawSkin(ctx, skinOf(skin), (SPRITE_W * PIXEL) / 2, SPRITE_H * PIXEL, 0, frame);
      if (walking) raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [skin, zoom, walking, w, h]);

  return <canvas ref={ref} style={{ width: w, height: h }} aria-hidden />;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sfx";

/** Cuanto se muestra "A JUGAR" antes de abrir el juego. */
const GO_MS = 900;

/**
 * Cuenta regresiva a pantalla completa: 5, 4, 3, 2, 1, A JUGAR.
 * Usa la hora del servidor (offset) para que todos los celulares y el
 * proyector cuenten sincronizados aunque sus relojes esten desfasados.
 *
 * Montalo con key={juego.id}: cada juego nuevo reinicia la cuenta.
 */
export function CountdownOverlay({
  startsAt,
  offset,
  title = "BINGO",
  onDone,
  sound = true,
  projector = false,
}: {
  startsAt: string;
  offset: number;
  title?: string;
  onDone?: () => void;
  sound?: boolean;
  projector?: boolean;
}) {
  const target = new Date(startsAt).getTime();
  const [now, setNow] = useState(() => Date.now() + offset);
  const onDoneRef = useRef(onDone);
  const lastSecond = useRef<number | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now() + offset;
      setNow(t);
      const left = target - t;
      const second = Math.ceil(left / 1000);
      if (sound && second !== lastSecond.current) {
        if (second > 0 && second <= 5) sfx.count();
        else if (second === 0) sfx.go();
      }
      lastSecond.current = second;
      if (left <= -GO_MS && !finished.current) {
        finished.current = true;
        onDoneRef.current?.();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [target, offset, sound]);

  const left = target - now;
  const seconds = Math.min(5, Math.ceil(left / 1000));

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-night/95 px-6 text-center"
      role="alert"
      aria-live="assertive"
    >
      <p className={`font-pixel text-gyellow ${projector ? "text-[3vw]" : "text-[16px]"}`}>
        {seconds > 0 ? `EL ${title} EMPIEZA EN` : `EMPIEZA EL ${title}`}
      </p>
      {seconds > 0 ? (
        <span
          key={seconds}
          className={`font-pixel px-pop mt-6 block leading-none text-cream ${projector ? "text-[28vw]" : "text-[140px]"}`}
          style={{ textShadow: "6px 6px 0 #ea4335, 12px 12px 0 #14142b" }}
        >
          {seconds}
        </span>
      ) : (
        <span
          className={`font-pixel px-pop mt-6 block leading-tight text-ggreen ${projector ? "text-[10vw]" : "text-[44px]"}`}
          style={{ textShadow: "4px 4px 0 #14142b" }}
        >
          A JUGAR!
        </span>
      )}
      {!projector && (
        <p className="mt-8 max-w-xs text-[17px] text-muted">
          Busca a quien cumpla cada casilla y pidele su codigo para que te firme.
        </p>
      )}
    </div>
  );
}

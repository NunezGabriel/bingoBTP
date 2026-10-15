"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sfx";

/** Cuanto se muestra "A JUGAR" antes de abrir la cartilla. */
const GO_MS = 900;

/**
 * Cuenta regresiva a pantalla completa: 5, 4, 3, 2, 1, A JUGAR.
 * Usa la hora del servidor (offset) para que todos los celulares y el
 * proyector cuenten sincronizados aunque sus relojes esten desfasados.
 *
 * Montalo con key={ronda.id}: cada ronda nueva reinicia la cuenta.
 */
export function CountdownOverlay({
  startsAt,
  offset,
  onDone,
  sound = true,
  projector = false,
}: {
  startsAt: string;
  offset: number;
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
  const colors = ["#4285f4", "#ea4335", "#fbbc04", "#34a853", "#ff5fa2"];

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-ink px-6 text-center text-white"
      role="alert"
      aria-live="assertive"
    >
      <p className={`font-black uppercase tracking-[0.2em] ${projector ? "text-[2.4vw]" : "text-2xl"}`}>
        Bingo
      </p>
      <p className={`mt-1 font-extrabold uppercase tracking-wide opacity-80 ${projector ? "text-[1.6vw]" : "text-[17px]"}`}>
        {seconds > 3 ? "repartiendo cartillas" : seconds > 0 ? "empieza en" : "ya"}
      </p>
      {seconds > 3 ? (
        <span className={`blink mt-3 block font-black leading-none ${projector ? "text-[20vw]" : "text-[8rem]"}`}>
          ...
        </span>
      ) : seconds > 0 ? (
        <span
          key={seconds}
          className={`pop mt-3 block font-black leading-none ${projector ? "text-[26vw]" : "text-[11rem]"}`}
          style={{ color: colors[(seconds - 1) % colors.length] }}
        >
          {seconds}
        </span>
      ) : (
        <span
          className={`pop mt-3 block font-black leading-none text-ggreen ${projector ? "text-[10vw]" : "text-7xl"}`}
        >
          A JUGAR
        </span>
      )}
      {!projector && (
        <p className="mt-10 max-w-xs text-[17px] font-semibold opacity-80">
          Busca a quien cumpla cada casilla y pidele su codigo.
        </p>
      )}
    </div>
  );
}

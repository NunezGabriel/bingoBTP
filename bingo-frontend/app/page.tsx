"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { publicApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import { CLASSES, HOUSE_KEYS } from "@/lib/sprites";
import type { EventView } from "@/lib/types";
import { Sprite } from "@/components/pixel/Sprite";
import { Logo, Volcano } from "@/components/pixel/Brand";
import { Loading } from "@/components/ui/Blocks";

export default function Landing() {
  const router = useRouter();
  const { status } = useSession();
  const [live, setLive] = useState<{ event: EventView | null; players: number } | null>(null);

  useEffect(() => {
    if (status === "ready") router.replace("/inicio");
  }, [status, router]);

  useEffect(() => {
    publicApi.event().then(setLive).catch(() => setLive({ event: null, players: 0 }));
  }, []);

  if (status === "loading" || status === "ready") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loading label="Cargando mundo" />
      </main>
    );
  }

  const parade = CLASSES.filter((c) => c.unlockLevel === 1);

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-5 pb-0 pt-10">
      <Logo />

      <div className="mt-6 min-h-[44px]">
        {live?.event ? (
          <div className="px-box flex flex-col items-center px-4 py-2 text-center" style={{ ["--box-bg" as string]: "#1c3a26" }}>
            <span className="font-pixel flex items-center gap-2 text-[9px] text-ggreen">
              <span className="px-blink block h-2 w-2 bg-ggreen" aria-hidden /> EN VIVO
            </span>
            <span className="mt-1 text-[18px] leading-tight text-cream">{live.event.name}</span>
            <span className="text-[15px] text-muted">{live.players} jugadores en la aventura</span>
          </div>
        ) : live ? (
          <p className="font-pixel text-[9px] text-muted">Proximo evento muy pronto</p>
        ) : null}
      </div>

      <p className="mt-6 max-w-sm text-center text-[19px] leading-snug text-cream">
        Crea tu personaje, conoce gente y suma puntos en los juegos del evento. Quien junte mas
        puntos se lleva los premios.
      </p>

      <div className="mt-7 flex w-full max-w-xs flex-col">
        <Link href="/crear" className="px-btn px-btn-yellow px-btn-lg w-auto">
          Crear personaje
        </Link>
        <Link href="/entrar" className="px-btn px-btn-dark mt-3">
          Ya tengo personaje
        </Link>
      </div>

      <p className="mt-4 max-w-xs text-center text-[15px] text-muted">
        Tu personaje se guarda para siempre: si ya jugaste en otro evento, entra con tu nombre y
        tu PIN y sigues sumando.
      </p>

      {/* desfile de clases caminando frente al volcan */}
      <div className="relative mt-auto h-[170px] w-full max-w-3xl" aria-hidden>
        <Volcano width={340} className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-90" />
        <div className="absolute inset-x-0 bottom-0 h-3 bg-[#2b2350]" />
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1 sm:gap-3">
          {parade.map((c, i) => (
            <div key={c.key} className="px-bob" style={{ animationDelay: `${(i % 2) * 0.5}s` }}>
              <Sprite cls={c.key} house={HOUSE_KEYS[i % 4]} size={40} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

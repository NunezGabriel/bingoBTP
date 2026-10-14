"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { publicApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { EventView } from "@/lib/types";
import { BingoWordmark, GdgLogo } from "@/components/Brand";
import { Loading } from "@/components/ui/Blocks";

export default function Landing() {
  const router = useRouter();
  const { status } = useSession();
  const [live, setLive] = useState<{ event: EventView | null; players: number } | null>(null);

  useEffect(() => {
    if (status === "ready") router.replace("/cartilla");
  }, [status, router]);

  useEffect(() => {
    publicApi.event().then(setLive).catch(() => setLive({ event: null, players: 0 }));
  }, []);

  if (status === "loading" || status === "ready") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loading />
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center px-5 pb-8 pt-8">
      <GdgLogo size={22} />

      <div className="mt-8">
        <BingoWordmark size={58} subtitle="GDG Arequipa" />
      </div>

      <div className="mt-6 min-h-[52px]">
        {live?.event ? (
          <div className="card flex flex-col items-center px-5 py-3 text-center" style={{ background: "#34a853", color: "#fff" }}>
            <span className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide">
              <span className="blink block h-2 w-2 rounded-full bg-white" aria-hidden /> En vivo
            </span>
            <span className="mt-1 text-lg font-extrabold leading-tight">{live.event.name}</span>
            <span className="text-[14px] font-semibold opacity-90">{live.players} jugando ahora</span>
          </div>
        ) : live ? (
          <span className="pill">Proximo evento muy pronto</span>
        ) : null}
      </div>

      <div className="card mt-6 w-full p-5">
        <p className="text-[17px] font-semibold leading-snug">
          Tu cartilla tiene <b>9 casillas</b>{" "}con cosas como &quot;alguien que use Flutter&quot;.
          Busca a quien cumpla cada una y pidele su <b>codigo</b> para firmarla.
        </p>
        <p className="mt-3 text-[15px] text-muted">
          Cada persona solo puede firmarte una casilla: para completar tienes que conocer a 9.
        </p>
      </div>

      <div className="mt-6 flex w-full flex-col gap-3">
        <Link href="/crear" className="btn btn-blue btn-lg">
          Crear mi cartilla
        </Link>
        <Link href="/entrar" className="btn">
          Ya tengo cuenta
        </Link>
      </div>

      <div className="mt-auto flex w-full items-center justify-center gap-3 pt-10" aria-hidden>
        <span className="h-7 w-7 rounded-full" style={{ background: "#4285f4" }} />
        <span className="h-7 w-7" style={{ background: "#ea4335" }} />
        <span className="h-7 w-7 rounded-full" style={{ background: "#fbbc04" }} />
        <span className="h-7 w-7" style={{ background: "#34a853" }} />
        <span className="h-7 w-7 rounded-full" style={{ background: "#ff5fa2" }} />
      </div>
    </main>
  );
}

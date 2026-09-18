"use client";

import Link from "next/link";
import { useSession } from "@/lib/session";
import { Avatar } from "@/components/pixel/Avatar";
import { PixelIcon } from "@/components/pixel/Sprite";
import { ProgressBar } from "@/components/ui/Blocks";
import { PlayerCode } from "@/components/game/PlayerCode";

export default function HomePage() {
  const { me } = useSession();
  if (!me) return null;
  const p = me.player;
  const prog = p.progress;
  const inLevel = prog.xp - prog.levelXp;
  const levelSpan = (prog.nextLevelXp ?? prog.xp) - prog.levelXp;

  return (
    <div className="flex flex-col gap-1">
      {/* bingo en marcha: lo mas importante arriba */}
      {me.game && (
        <Link href="/juego" className="px-btn px-btn-yellow px-btn-lg px-bob w-[calc(100%-8px)]">
          <PixelIcon name="grid" size={18} />
          {me.game.status === "COUNTDOWN" ? "EL BINGO VA A EMPEZAR" : "JUGAR BINGO"}
        </Link>
      )}

      {/* personaje */}
      <section className="px-box flex flex-col items-center p-4 text-center">
        <Avatar cls={p.avatarClass} house={p.avatarHouse} tier={p.tier} size={128} bob />
        <p className="font-pixel mt-1 text-[15px] text-cream">{p.nickname}</p>
        <p className="mt-1 text-[17px] text-gyellow">
          Nivel {p.level} · {p.title}
        </p>
        <div className="mt-2 w-full max-w-[240px]">
          <ProgressBar value={inLevel} max={levelSpan || 1} color="#a45cff" />
        </div>
      </section>

      <PlayerCode code={p.code} hint="Dictalo para que te firmen el bingo, te agreguen o el staff te de puntos." />

      {/* puntos del evento */}
      {me.event ? (
        <section className="px-box p-4 text-center" style={{ ["--box-bg" as string]: "#23234f" }}>
          <p className="text-[16px] text-muted">{me.event.name}</p>
          <p className="font-pixel mt-2 text-[32px] leading-none text-gold">{me.standing?.points ?? 0}</p>
          <p className="font-pixel mt-2 text-[10px] text-cream">
            PUNTOS{me.standing?.rank ? ` · PUESTO #${me.standing.rank}` : ""}
          </p>
        </section>
      ) : (
        <section className="px-box p-4 text-center">
          <p className="text-[17px] text-muted">No hay un evento abierto ahora. Tu personaje te espera para el proximo.</p>
        </section>
      )}

      {(p.role === "STAFF" || p.role === "ADMIN") && (
        <Link href="/staff" className="px-btn px-btn-green mt-1 w-[calc(100%-8px)]">
          <PixelIcon name="star" size={14} /> Dar puntos (staff)
        </Link>
      )}
    </div>
  );
}

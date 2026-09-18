"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { admin, errorMessage, type RunningGame } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";
import type { BingoResults, GameSession, PublicPlayer } from "@/lib/types";
import { Card, ConfirmButton } from "@/components/admin/Form";
import { Avatar } from "@/components/pixel/Avatar";
import { PixelIcon } from "@/components/pixel/Sprite";
import { ErrorBox, Loading } from "@/components/ui/Blocks";
import { useToast } from "@/components/ui/Toasts";

const PODIUM = ["#ffd23f", "#d3dbe6", "#d8894a"];

function Winners({ results }: { results: BingoResults }) {
  if (results.winners.length === 0) {
    return <p className="text-[16px] text-muted">Nadie completo su cartilla todavia.</p>;
  }
  return (
    <ol className="flex flex-col gap-1">
      {results.winners.slice(0, 5).map((w) => (
        <li key={w.player.id} className="px-inset flex items-center gap-3 p-2">
          <span className="font-pixel w-6 text-center text-[13px]" style={{ color: PODIUM[w.rank - 1] ?? "#9f9fc7" }}>
            {w.rank}
          </span>
          <Avatar cls={w.player.avatarClass} house={w.player.avatarHouse} tier={w.player.tier} size={34} />
          <span className="min-w-0 flex-1 truncate text-[17px] text-cream">{w.player.nickname}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AdminBingoPage() {
  const toast = useToast();
  const [data, setData] = useState<Awaited<ReturnType<typeof admin.game>> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    admin
      .game()
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime("game:countdown", load);
  useRealtime<GameSession>("game:started", (g) =>
    setData((d) => (d?.running && d.running.id === g.id ? { ...d, running: { ...d.running, ...g } } : d)),
  );
  useRealtime("game:ended", load);
  useRealtime("event:update", load);
  useRealtime("resync", load);
  useRealtime<BingoResults & { sessionId: number }>("bingo:progress", (p) =>
    setData((d) => (d?.running && d.running.id === p.sessionId ? { ...d, running: { ...d.running, progress: p } } : d)),
  );
  useRealtime<{ sessionId: number; rank: number; player: PublicPlayer }>("bingo:completed", (e) =>
    setData((d) => {
      const running: RunningGame | null = d?.running ?? null;
      if (!d || !running || running.id !== e.sessionId || running.progress.winners.some((w) => w.rank === e.rank)) return d;
      const winners = [...running.progress.winners, { rank: e.rank, player: e.player }].sort((a, b) => a.rank - b.rank);
      return {
        ...d,
        running: {
          ...running,
          progress: { ...running.progress, winners, completed: Math.max(running.progress.completed, e.rank) },
        },
      };
    }),
  );

  async function start() {
    setBusy(true);
    try {
      const r = await admin.startBingo();
      toast.success("Bingo iniciado", `${r.boards} cartillas repartidas`);
      load();
    } catch (e) {
      toast.error("No se pudo iniciar", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function end(id: number) {
    setBusy(true);
    try {
      const r = await admin.endGame(id);
      const winner = r.results.winners[0];
      toast.success("Bingo terminado", winner ? `Gano ${winner.player.nickname}` : "Nadie completo su cartilla");
      load();
    } catch (e) {
      toast.error("No se pudo terminar", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loading />;

  if (!data.event) {
    return (
      <Card>
        <p className="font-pixel text-[11px] text-cream">Primero abre un evento</p>
        <p className="mt-2 text-[16px] text-muted">El bingo solo lo juegan los inscritos del evento abierto.</p>
        <Link href="/admin" className="px-btn px-btn-yellow mt-3">
          <PixelIcon name="flag" size={14} /> Ir a Evento
        </Link>
      </Card>
    );
  }

  const running = data.running;

  return (
    <>
      {running ? (
        <Card color="#2d2257">
          <p className="font-pixel text-[9px] text-gyellow">
            {running.status === "ACTIVE" ? "BINGO EN CURSO" : "CUENTA REGRESIVA..."}
          </p>
          <p className="font-pixel mt-3 text-[26px] leading-none text-cream">
            {running.progress.completed}
            <span className="text-[14px] text-muted"> de {running.progress.boards} completaron</span>
          </p>

          <div className="mt-4">
            <p className="font-pixel mb-2 text-[9px] text-muted">GANADORES</p>
            <Winners results={running.progress} />
          </div>

          {running.progress.closest.length > 0 && (
            <div className="mt-4">
              <p className="font-pixel mb-2 text-[9px] text-muted">VAN MAS CERCA</p>
              <ul className="flex flex-col gap-1">
                {running.progress.closest.map((c) => (
                  <li key={c.player.id} className="flex items-center gap-2">
                    <Avatar cls={c.player.avatarClass} house={c.player.avatarHouse} tier={c.player.tier} size={28} />
                    <span className="min-w-0 flex-1 truncate text-[16px] text-cream">{c.player.nickname}</span>
                    <span className="font-pixel text-[10px] text-gold">{c.signed}/9</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ConfirmButton className="px-btn-red mt-4" confirmLabel="Terminar para todos?" disabled={busy} onConfirm={() => end(running.id)}>
            Terminar bingo
          </ConfirmButton>
        </Card>
      ) : (
        <Card>
          <p className="font-pixel text-[12px] text-gyellow">BINGO</p>
          <p className="mt-2 text-[17px] leading-snug text-cream">
            Al iniciarlo, los inscritos en <b>{data.event.name}</b> veran una cuenta regresiva 5, 4, 3, 2, 1 y
            recibiran su cartilla de 9 casillas. Cada casilla la firma otra persona con su codigo.
          </p>
          <ConfirmButton className="px-btn-yellow px-btn-lg mt-4" confirmLabel="Iniciar para todos?" disabled={busy} onConfirm={start}>
            <PixelIcon name="play" size={16} /> INICIAR BINGO
          </ConfirmButton>
          <p className="mt-3 text-[14px] text-muted">
            Los puntos y las preguntas se editan en el codigo: bingo-backend/src/content/bingo.js
          </p>
        </Card>
      )}

      {!running && data.last && (
        <Card title="ULTIMO BINGO">
          <Winners results={data.last.results} />
        </Card>
      )}
    </>
  );
}

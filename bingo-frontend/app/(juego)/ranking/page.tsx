"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, publicApi } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";
import { useSession } from "@/lib/session";
import type { HouseRow, LeaderboardRow, Standing } from "@/lib/types";
import { Empty, ErrorBox, Loading, PageTitle } from "@/components/ui/Blocks";
import { HouseBars, LeaderboardList } from "@/components/game/Leaderboard";

export default function RankingPage() {
  const { me } = useSession();
  const [board, setBoard] = useState<{ top: LeaderboardRow[]; houses: HouseRow[]; me: Standing | null } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    publicApi
      .leaderboard(50)
      .then((r) => {
        setBoard(r);
        setError("");
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Mientras la pantalla esta abierta se refresca cada 15 s.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  useRealtime("points", load);
  useRealtime("resync", load);

  return (
    <div>
      <PageTitle icon="trophy" title="Ranking" subtitle={me?.event?.name ?? "Sin evento abierto"} />

      {error && <ErrorBox message={error} onRetry={load} />}

      {!board ? (
        <Loading />
      ) : !me?.event ? (
        <Empty icon="trophy" title="No hay un evento abierto">
          Aqui vas a ver quien va ganando durante el evento.
        </Empty>
      ) : (
        <>
          {board.me?.rank && (
            <div className="px-box mb-1 flex items-center justify-between p-3" style={{ ["--box-bg" as string]: "#2d2257" }}>
              <span className="font-pixel text-[10px] text-cream">TU PUESTO</span>
              <span className="font-pixel text-[16px] text-gold">
                #{board.me.rank}
                <span className="ml-2 text-[9px] text-muted">de {board.me.total}</span>
              </span>
            </div>
          )}

          <div className="px-box mb-1 p-3">
            <p className="font-pixel mb-2 text-[9px] text-muted">COPA DE CASAS</p>
            <HouseBars houses={board.houses} />
          </div>

          {board.top.length === 0 ? (
            <Empty icon="star" title="Nadie ha sumado puntos aun">
              Se el primero: firma el bingo o pide puntos al staff.
            </Empty>
          ) : (
            <LeaderboardList rows={board.top} highlightId={me.player.id} />
          )}
        </>
      )}
    </div>
  );
}

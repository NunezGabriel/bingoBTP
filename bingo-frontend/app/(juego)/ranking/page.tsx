"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, publicApi } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";
import { useSession } from "@/lib/session";
import type { LeaderboardRow, Standing } from "@/lib/types";
import { Empty, ErrorBox, Loading, PageTitle } from "@/components/ui/Blocks";

const PODIUM = ["#fbbc04", "#c9c9c9", "#cd7f32"];

export default function RankingPage() {
  const { me } = useSession();
  const [board, setBoard] = useState<{ top: LeaderboardRow[]; me: Standing | null } | null>(null);
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
      <PageTitle title="Ranking" subtitle={me?.event?.name ?? "Sin evento abierto"} />

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
            <div className="card mb-3 flex items-center justify-between p-4" style={{ background: "#4285f4", color: "#fff" }}>
              <span className="font-extrabold">Tu puesto</span>
              <span className="text-2xl font-black">
                #{board.me.rank}
                <span className="ml-2 text-[13px] font-bold opacity-80">de {board.me.total}</span>
              </span>
            </div>
          )}

          {board.top.length === 0 ? (
            <Empty icon="star" title="Nadie ha sumado puntos aun">
              Se el primero: consigue firmas en tu cartilla.
            </Empty>
          ) : (
            <ol className="flex flex-col gap-2">
              {board.top.map((r) => {
                const mine = r.player.id === me.player.id;
                return (
                  <li
                    key={r.player.id}
                    className="card flex items-center gap-3 px-4 py-3"
                    style={mine ? { background: "#fff7d6" } : undefined}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[15px] font-black"
                      style={{ background: PODIUM[r.rank - 1] ?? "#f0f0f0" }}
                    >
                      {r.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[17px] font-bold">
                      {r.player.name}
                      {mine && <span className="ml-1 text-[13px] font-extrabold text-gblue">(tu)</span>}
                    </span>
                    <span className="text-xl font-black">{r.points}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

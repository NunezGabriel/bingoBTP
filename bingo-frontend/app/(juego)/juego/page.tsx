"use client";

import confetti from "canvas-confetti";
import { useCallback, useEffect, useState } from "react";
import { ApiError, cleanCode, errorMessage, game } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";
import { useSession } from "@/lib/session";
import { sfx } from "@/lib/sfx";
import type { BingoBoard, BingoCell, BingoResults, GameSession, PublicPlayer } from "@/lib/types";
import { Avatar } from "@/components/pixel/Avatar";
import { PixelIcon, Sprite } from "@/components/pixel/Sprite";
import { Empty, ErrorBox, Loading, PageTitle, ProgressBar } from "@/components/ui/Blocks";
import { Modal } from "@/components/ui/Modal";

type State = { game: GameSession | null; board: BingoBoard | null; winners: BingoResults["winners"]; noEvent?: boolean };

const PODIUM = ["#ffd23f", "#d3dbe6", "#d8894a"];

export default function GamePage() {
  const { me } = useSession();
  const [data, setData] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [cell, setCell] = useState<BingoCell | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [signError, setSignError] = useState("");
  const [celebrate, setCelebrate] = useState<number | null>(null);

  const load = useCallback(() => {
    game
      .current()
      .then((r) => {
        setData(r);
        setError("");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 409) {
          setData({ game: null, board: null, winners: [], noEvent: true });
          setError("");
        } else {
          setError(errorMessage(e));
        }
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  // Al arrancar el juego todos piden su cartilla: se reparte en menos de un segundo.
  useRealtime("game:started", () => window.setTimeout(load, Math.random() * 800));
  useRealtime("game:countdown", load);
  useRealtime("game:ended", load);
  useRealtime("resync", load);
  useRealtime<{ sessionId: number; rank: number; player: PublicPlayer }>("bingo:completed", (e) => {
    setData((d) => {
      if (!d?.game || d.game.id !== e.sessionId) return d;
      const winners = [...d.winners.filter((w) => w.rank !== e.rank), { rank: e.rank, player: e.player }]
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 3);
      return { ...d, winners };
    });
  });

  function openCell(c: BingoCell) {
    if (c.signedBy) return;
    sfx.click();
    setCell(c);
    setCode("");
    setSignError("");
  }

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    if (!cell || busy || code.length !== 6) return;
    setBusy(true);
    setSignError("");
    try {
      const result = await game.signBingo(cell.position, code);
      setData((d) => (d ? { ...d, board: result.board } : d));
      setCell(null);
      if (result.completedRank) {
        sfx.bingo();
        setCelebrate(result.completedRank);
        const colors = ["#4285f4", "#ea4335", "#fbbc04", "#34a853"];
        confetti({ particleCount: 140, spread: 100, origin: { y: 0.55 }, colors, shapes: ["square"] });
      } else {
        sfx.coin();
      }
    } catch (err) {
      sfx.error();
      setSignError(errorMessage(err));
      // Si el juego termino mientras firmaba, se recarga el estado.
      if (err instanceof ApiError && err.status === 409 && /termino|no hay un bingo/i.test(err.message)) load();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Loading label="Buscando juego" />;

  if (!data.game) {
    return (
      <Empty icon="grid" title={data.noEvent ? "No hay un evento en curso" : "No hay juego en curso"}>
        Cuando el admin lance el bingo, todos veran una cuenta regresiva y aqui aparecera tu cartilla.
      </Empty>
    );
  }
  if (data.game.status === "COUNTDOWN" || !data.board) return <Loading label="Repartiendo cartillas" />;

  const board = data.board;
  const bonus = board.podiumBonus;
  const myRank = board.completedRank;

  return (
    <div>
      <PageTitle
        icon="grid"
        title="Bingo"
        subtitle={`+${board.cellPoints} por firma · +${board.completePoints} al completar`}
      />

      <div className="px-box mb-2 p-3">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[9px] text-muted">FIRMAS</span>
          <span className="font-pixel text-[11px] text-gold">
            {board.signed}/{board.size}
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={board.signed} max={board.size} color="#4285f4" />
        </div>
        <p className="mt-2 text-[15px] leading-snug text-muted">
          Toca una casilla y escribe el codigo de quien la cumpla. Cada persona solo puede firmarte una
          casilla. Los 3 primeros en completar ganan +{bonus[0]}, +{bonus[1]} y +{bonus[2]} extra.
        </p>
      </div>

      {myRank && (
        <div className="px-box px-pop mb-2 p-3 text-center" style={{ ["--box-bg" as string]: "#1d7438" }}>
          <p className="font-pixel text-[16px] text-cream">BINGO! PUESTO #{myRank}</p>
          <p className="mt-1 text-[16px] text-cream">Completaste tu cartilla. Espera el proximo juego.</p>
        </div>
      )}

      {data.winners.length > 0 && (
        <div className="px-box mb-2 flex items-center gap-2 px-3 py-2" style={{ ["--box-bg" as string]: "#2d2257" }}>
          <span className="font-pixel shrink-0 text-[8px] text-muted">YA COMPLETARON</span>
          <ol className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
            {data.winners.map((w) => (
              <li key={w.rank} className="flex min-w-0 items-center gap-1">
                <span className="font-pixel text-[10px]" style={{ color: PODIUM[w.rank - 1] }}>
                  {w.rank}
                </span>
                <Sprite cls={w.player.avatarClass} house={w.player.avatarHouse} size={22} />
                <span className={`truncate text-[14px] ${w.player.id === me?.player.id ? "text-gyellow" : "text-cream"}`}>
                  {w.player.nickname}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-3">
        {board.cells.map((c) => (
          <button
            key={c.position}
            type="button"
            onClick={() => openCell(c)}
            disabled={Boolean(c.signedBy)}
            className="px-box flex aspect-[3/4] flex-col items-center justify-between p-2 text-center"
            style={{ ["--box-bg" as string]: c.signedBy ? "#1f3f6e" : "#1f1f45" }}
            aria-label={c.signedBy ? `Firmada por ${c.signedBy.nickname}: ${c.text}` : c.text}
          >
            {c.signedBy ? (
              <>
                <span className="font-pixel self-start text-[8px] text-gblue">{c.position + 1}</span>
                <Sprite cls={c.signedBy.avatarClass} house={c.signedBy.avatarHouse} size={44} />
                <span className="font-pixel w-full truncate text-[7px] text-cream">{c.signedBy.nickname}</span>
              </>
            ) : (
              <>
                <span className="font-pixel self-start text-[8px] text-gyellow">{c.position + 1}</span>
                <span className="line-clamp-4 text-[13px] leading-[1.15] text-cream">
                  {c.text.replace(/^Encuentra a alguien (que )?/i, "")}
                </span>
                <PixelIcon name="edit" size={12} className="text-muted" />
              </>
            )}
          </button>
        ))}
      </div>

      <Modal open={cell !== null} onClose={() => setCell(null)} title={`CASILLA ${cell ? cell.position + 1 : ""}`}>
        {cell && (
          <form onSubmit={sign}>
            <p className="text-center text-[21px] leading-snug text-cream">{cell.text}</p>
            <label htmlFor="sign-code" className="font-pixel mt-5 block text-[9px] text-muted">
              CODIGO DE LA PERSONA
            </label>
            <div className="mt-1 flex items-center">
              <input
                id="sign-code"
                className="px-input px-input-code flex-1"
                value={code}
                onChange={(e) => setCode(cleanCode(e.target.value))}
                placeholder="CODIGO"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
              <button type="submit" className="px-btn px-btn-yellow" disabled={busy || code.length !== 6}>
                {busy ? "..." : "Firmar"}
              </button>
            </div>
            {signError && <p className="mt-3 text-center text-[17px] text-gred">{signError}</p>}
          </form>
        )}
      </Modal>

      <Modal open={celebrate !== null} onClose={() => setCelebrate(null)} title="LO LOGRASTE">
        <div className="flex flex-col items-center text-center">
          <div className="flex -space-x-2">
            {board.cells.slice(0, 5).map((c) =>
              c.signedBy ? (
                <Avatar key={c.position} cls={c.signedBy.avatarClass} house={c.signedBy.avatarHouse} size={48} />
              ) : null,
            )}
          </div>
          <p className="font-pixel px-pop mt-3 text-[26px] text-gold">BINGO!</p>
          <p className="mt-2 text-[18px] text-cream">
            Llegaste en el puesto #{celebrate}. +{board.completePoints + (celebrate ? (bonus[celebrate - 1] ?? 0) : 0)}{" "}
            puntos extra.
          </p>
          <button type="button" className="px-btn px-btn-green mt-5" onClick={() => setCelebrate(null)}>
            Genial
          </button>
        </div>
      </Modal>
    </div>
  );
}

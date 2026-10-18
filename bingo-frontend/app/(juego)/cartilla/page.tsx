"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, cleanCode, errorMessage, game } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";
import { useSession } from "@/lib/session";
import { sfx } from "@/lib/sfx";
import type { Card, Cell, Player, Round, RoundResults } from "@/lib/types";
import { celebrate } from "@/components/GameShell";
import { PlayerCode } from "@/components/PlayerCode";
import { Icon } from "@/components/ui/Icon";
import { Empty, ErrorBox, Loading, PageTitle, ProgressBar } from "@/components/ui/Blocks";
import { Modal } from "@/components/ui/Modal";

type State = {
  round: Round | null;
  card: Card | null;
  winners: RoundResults["winners"];
  noEvent?: boolean;
};

const PODIUM = ["#fbbc04", "#c9c9c9", "#cd7f32"];
/** Colores de los numeros de la cartilla, en el orden del logo de Google. */
const NUMBER_COLORS = ["#4285f4", "#ea4335", "#fbbc04", "#34a853", "#ff5fa2"];

export default function CardPage() {
  const { me } = useSession();
  const [data, setData] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [cell, setCell] = useState<Cell | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [signError, setSignError] = useState("");
  const [bingoRank, setBingoRank] = useState<number | null>(null);

  const load = useCallback(() => {
    game
      .current()
      .then((r) => {
        setData(r);
        setError("");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 409) {
          setData({ round: null, card: null, winners: [], noEvent: true });
          setError("");
        } else {
          setError(errorMessage(e));
        }
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  // Al arrancar la ronda todos piden su cartilla: se reparte en menos de un segundo.
  useRealtime("round:started", () => window.setTimeout(load, Math.random() * 800));
  useRealtime("round:countdown", load);
  useRealtime("round:ended", load);
  useRealtime("resync", load);
  useRealtime<{ roundId: number; rank: number; player: Player }>("bingo:completed", (e) => {
    setData((d) => {
      if (!d?.round || d.round.id !== e.roundId) return d;
      const winners = [...d.winners.filter((w) => w.rank !== e.rank), { rank: e.rank, player: e.player }]
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 3);
      return { ...d, winners };
    });
  });

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    if (!cell || busy || code.length !== 6) return;
    setBusy(true);
    setSignError("");
    try {
      const result = await game.sign(cell.position, code);
      setData((d) => (d ? { ...d, card: result.card } : d));
      setCell(null);
      setCode("");
      if (result.completedRank) {
        sfx.bingo();
        setBingoRank(result.completedRank);
        celebrate();
      } else {
        sfx.ok();
      }
    } catch (err) {
      sfx.error();
      setSignError(errorMessage(err));
      if (err instanceof ApiError && err.status === 409 && /ronda/i.test(err.message)) load();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data || !me) return <Loading label="Buscando tu cartilla" />;

  if (!data.round) {
    return (
      <div className="flex flex-col gap-3">
        <PageTitle title="Tu cartilla" subtitle={me.event?.name ?? "Sin evento abierto"} />
        <Empty icon="clock" title={data.noEvent ? "No hay un evento abierto" : "La ronda aun no empieza"}>
          Cuando el admin la empiece veras una cuenta regresiva y tu cartilla aparece sola.
        </Empty>
        <PlayerCode code={me.player.code} hint="Dictalo para que te firmen una casilla." />
      </div>
    );
  }

  if (data.round.status === "COUNTDOWN" || !data.card) return <Loading label="Repartiendo cartillas" />;

  const card = data.card;
  const bonus = data.round.podiumBonus;

  return (
    <div className="flex flex-col gap-3">
      <PageTitle
        title={`Ronda ${data.round.number}`}
        subtitle={`${data.round.cellPoints} pts por firma · ${data.round.completePoints} al completar`}
        right={
          <span className="pill" style={{ background: "#4285f4", color: "#fff" }}>
            {card.signed}/{card.size}
          </span>
        }
      />

      <ProgressBar value={card.signed} max={card.size} />

      {card.completedRank ? (
        <div className="card pop p-4 text-center" style={{ background: "#34a853", color: "#fff" }}>
          <p className="text-2xl font-black">BINGO · puesto #{card.completedRank}</p>
          <p className="mt-1 text-[15px]">Completaste tu cartilla. Espera la siguiente ronda.</p>
        </div>
      ) : (
        <p className="text-[15px] text-muted">
          Toca una casilla para ver su pregunta y firmarla con el codigo de quien la cumpla.
          Cada persona solo puede firmarte una.
        </p>
      )}

      {data.winners.length > 0 && (
        <div className="card-flat flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
          <span className="text-[12px] font-extrabold uppercase text-muted">Ya completaron</span>
          {data.winners.map((w) => (
            <span key={w.rank} className="flex items-center gap-1 text-[14px] font-bold">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink text-[11px]"
                style={{ background: PODIUM[w.rank - 1] }}
              >
                {w.rank}
              </span>
              {w.player.name}
            </span>
          ))}
        </div>
      )}

      {/* Solo numeros: la pregunta aparece al tocar la casilla. */}
      <div className="grid grid-cols-3 gap-2">
        {card.cells.map((c) => (
          <button
            key={c.position}
            type="button"
            onClick={() => {
              sfx.tap();
              setCell(c);
              setCode("");
              setSignError("");
            }}
            className={`cell ${c.signedBy ? "cell-signed" : ""}`}
            style={c.signedBy ? undefined : { color: NUMBER_COLORS[c.position % NUMBER_COLORS.length] }}
            aria-label={
              c.signedBy
                ? `Casilla ${c.position + 1}, firmada por ${c.signedBy.name}. Toca para ver la pregunta`
                : `Casilla ${c.position + 1}, libre. Toca para ver la pregunta`
            }
          >
            {c.position + 1}
            {c.signedBy && (
              <span className="cell-mark" aria-hidden>
                <Icon name="check" size={14} />
              </span>
            )}
          </button>
        ))}
      </div>


      <PlayerCode code={me.player.code} hint="Dictalo cuando alguien te pida firmar su casilla." />

      <p className="pb-2 text-center text-[13px] text-muted">
        Los 3 primeros en completar ganan +{bonus[0]}, +{bonus[1]} y +{bonus[2]} puntos extra.
      </p>

      <Modal open={cell !== null} onClose={() => setCell(null)} title={`Casilla ${cell ? cell.position + 1 : ""}`}>
        {cell && (
          <>
            <p className="text-[20px] font-semibold leading-snug">{cell.text}</p>

            {cell.signedBy ? (
              <>
                <p className="mt-4 flex items-center gap-2 text-[17px] font-extrabold text-ggreen">
                  <Icon name="check" size={20} /> Firmada por {cell.signedBy.name}
                </p>
                <button type="button" className="btn mt-4 w-full" onClick={() => setCell(null)}>
                  Cerrar
                </button>
              </>
            ) : (
              <form onSubmit={sign}>
                <label htmlFor="sign-code" className="mt-4 block text-[13px] font-extrabold uppercase text-muted">
                  Codigo de quien la cumple
                </label>
                <input
                  id="sign-code"
                  className="input input-code mt-2"
                  value={code}
                  onChange={(e) => setCode(cleanCode(e.target.value))}
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  autoFocus
                />
                {signError && <p className="mt-3 text-center font-semibold text-gred">{signError}</p>}
                <button type="submit" className="btn btn-green btn-lg mt-4 w-full" disabled={busy || code.length !== 6}>
                  {busy ? "Firmando..." : "Firmar casilla"}
                </button>
              </form>
            )}
          </>
        )}
      </Modal>

      <Modal open={bingoRank !== null} onClose={() => setBingoRank(null)} title="¡BINGO!">
        <p className="text-[18px] font-semibold">
          Completaste las 9 casillas y llegaste en el puesto #{bingoRank}.
        </p>
        <p className="mt-2 text-[16px] text-muted">
          +{data.round.completePoints + (bingoRank ? (bonus[bingoRank - 1] ?? 0) : 0)} puntos.
        </p>
        <button type="button" className="btn btn-yellow mt-4 w-full" onClick={() => setBingoRank(null)}>
          Genial
        </button>
      </Modal>
    </div>
  );
}

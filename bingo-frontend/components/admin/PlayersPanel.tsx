"use client";

import { useCallback, useEffect, useState } from "react";
import { admin, errorMessage } from "@/lib/api";
import type { AdminPlayer } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Loading, Pill } from "@/components/ui/Blocks";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toasts";
import { ConfirmButton } from "./ConfirmButton";

export function PlayersPanel({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [onlyEvent, setOnlyEvent] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; hasMore: boolean; players: AdminPlayer[] } | null>(null);
  const [selected, setSelected] = useState<AdminPlayer | null>(null);
  const [pin, setPin] = useState("");
  const [points, setPoints] = useState({ amount: "", reason: "" });

  const load = useCallback(
    (nextPage = 1) => {
      admin
        .players({ q, onlyEvent, page: nextPage })
        .then((r) =>
          setData((prev) =>
            nextPage === 1 || !prev
              ? { total: r.total, hasMore: r.hasMore, players: r.players }
              : { total: r.total, hasMore: r.hasMore, players: [...prev.players, ...r.players] },
          ),
        )
        .catch((e) => toast.error("No se cargaron", errorMessage(e)));
    },
    [q, onlyEvent, toast],
  );

  useEffect(() => {
    const t = window.setTimeout(() => load(1), 250);
    return () => window.clearTimeout(t);
  }, [load]);

  async function act(action: () => Promise<unknown>, message: string, close = false) {
    try {
      await action();
      toast.ok(message);
      load(1);
      onChanged();
      if (close) setSelected(null);
    } catch (e) {
      toast.error("No se pudo", errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <Icon name="search" size={18} className="text-muted" />
          <input
            className="input"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre o codigo"
            aria-label="Buscar jugador"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`btn btn-sm ${onlyEvent ? "btn-blue" : ""}`}
            onClick={() => {
              setOnlyEvent(true);
              setPage(1);
            }}
          >
            Del evento
          </button>
          <button
            type="button"
            className={`btn btn-sm ${onlyEvent ? "" : "btn-blue"}`}
            onClick={() => {
              setOnlyEvent(false);
              setPage(1);
            }}
          >
            Todos ({data?.total ?? "..."})
          </button>
        </div>
      </div>

      {!data ? (
        <Loading />
      ) : data.players.length === 0 ? (
        <p className="px-1 text-[15px] text-muted">Nadie coincide con esa busqueda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.players.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(p);
                  setPin("");
                  setPoints({ amount: "", reason: "" });
                }}
                className="card flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-bold">{p.name}</span>
                  <span className="text-[13px] font-extrabold tracking-wider text-gblue">{p.code}</span>
                </span>
                {!p.inEvent && <Pill>fuera</Pill>}
                {p.points !== null && <span className="text-lg font-black">{p.points}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {data?.hasMore && (
        <button
          type="button"
          className="btn"
          onClick={() => {
            const next = page + 1;
            setPage(next);
            load(next);
          }}
        >
          Ver mas
        </button>
      )}

      <div className="card p-4">
        <h3 className="font-extrabold">Empezar de cero</h3>
        <p className="mt-1 text-[14px] text-muted">
          Borra todas las cuentas, cartillas y puntos. Util para ensayar antes del evento.
        </p>
        <ConfirmButton
          className="btn-red mt-3"
          confirmLabel="Seguro? borra TODO"
          onConfirm={() => act(() => admin.deleteAllPlayers(), "Todos los jugadores borrados")}
        >
          <Icon name="trash" size={16} /> Borrar todos los jugadores
        </ConfirmButton>
      </div>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="flex flex-col gap-4">
            <p className="text-[15px]">
              Codigo <b className="tracking-widest text-gblue">{selected.code}</b>
              {selected.points !== null && ` · ${selected.points} puntos en el evento`}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  () => admin.adjustPoints(selected.id, Number(points.amount), points.reason.trim()),
                  "Puntos ajustados",
                );
                setPoints({ amount: "", reason: "" });
              }}
            >
              <label className="block text-[13px] font-extrabold uppercase text-muted">Ajustar puntos</label>
              <div className="mt-1 grid grid-cols-[90px_1fr] gap-2">
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="+50"
                  aria-label="Cantidad"
                  value={points.amount}
                  onChange={(e) => setPoints({ ...points, amount: e.target.value.replace(/[^\d-]/g, "") })}
                />
                <input
                  className="input"
                  placeholder="Motivo"
                  aria-label="Motivo"
                  value={points.reason}
                  onChange={(e) => setPoints({ ...points, reason: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="btn btn-sm mt-2"
                disabled={!Number(points.amount) || points.reason.trim().length < 3}
              >
                Aplicar
              </button>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(() => admin.resetClave(selected.id, pin), `Clave nueva: ${pin}. Disela al jugador.`);
                setPin("");
              }}
            >
              <label className="block text-[13px] font-extrabold uppercase text-muted">Si olvido su clave</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Clave nueva"
                  aria-label="Clave nueva"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                />
                <button type="submit" className="btn btn-sm" disabled={pin.length < 4}>
                  Cambiar
                </button>
              </div>
            </form>

            <ConfirmButton
              className="btn-red"
              confirmLabel="Borrar su cuenta?"
              onConfirm={() => act(() => admin.deletePlayer(selected.id), "Jugador eliminado", true)}
            >
              <Icon name="trash" size={16} /> Eliminar jugador
            </ConfirmButton>
          </div>
        )}
      </Modal>
    </div>
  );
}

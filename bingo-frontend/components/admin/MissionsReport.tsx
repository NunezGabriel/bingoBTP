"use client";

import { useCallback, useEffect, useState } from "react";
import { admin, errorMessage } from "@/lib/api";
import type { MissionReport } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Blocks";

/**
 * Para la premiacion: quien completo la tarjeta y como va cada mision.
 *
 * Al final del evento esta es la lista que se lee en voz alta, asi que lo
 * primero que se ve son los que completaron las cuatro.
 */
export function MissionsReport() {
  const [data, setData] = useState<MissionReport | null>(null);
  const [error, setError] = useState("");
  const [todos, setTodos] = useState(false);

  const load = useCallback(() => {
    admin
      .missionReport()
      .then((r) => {
        setData(r);
        setError("");
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => load(), [load]);

  if (error) return <p className="text-[15px] font-semibold text-gred">{error}</p>;
  if (!data) return <Loading />;

  const lista = todos ? data.people : data.completas;

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-extrabold">Tarjetas de misiones</h2>
        <button type="button" className="btn btn-sm" onClick={load} aria-label="Actualizar">
          <Icon name="refresh" size={14} />
        </button>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {data.porMision.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-[14px]">
            <span className="min-w-0 flex-1 truncate">{m.title}</span>
            <span className="font-black">{m.count}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-3xl font-black leading-none">
        {data.completas.length}
        <span className="text-base font-bold text-muted"> completaron las {data.total}</span>
      </p>

      {lista.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted">
          {todos ? "Nadie valido ninguna mision todavia." : "Todavia nadie completo la tarjeta."}
        </p>
      ) : (
        <ol className="mt-3 flex flex-col gap-1.5">
          {lista.map((row) => (
            <li key={row.player.id} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate font-semibold">{row.player.name}</span>
              <span className="pill text-[11px]">
                {row.done.length}/{data.total}
              </span>
            </li>
          ))}
        </ol>
      )}

      <button type="button" className="btn btn-sm mt-3 w-full" onClick={() => setTodos((v) => !v)}>
        {todos ? "Ver solo los que completaron" : `Ver a todos (${data.people.length})`}
      </button>
    </section>
  );
}

"use client";

import {
  AdminProgresoItem,
  AdminProgresoResponse,
  crearNuevaRondaAdmin,
  eliminarTodosLosParticipantesAdmin,
  eliminarUsuarioAdmin,
  finalizarRondaAdmin,
  loginPorCodigo,
  obtenerMiSesion,
  obtenerProgresoAdmin,
  suscribirProgresoAdmin,
} from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";
import IoBadge from "@/components/ioBadge";

type PendingAction =
  | { tipo: "usuario"; usuario: AdminProgresoItem }
  | { tipo: "todos" };

export default function AdminViewPage() {
  const [codigo, setCodigo] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingRonda, setCreatingRonda] = useState(false);
  const [endingRonda, setEndingRonda] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [data, setData] = useState<AdminProgresoResponse | null>(null);
  const [enVivo, setEnVivo] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const bingosPrevios = useRef<number | null>(null);

  const refrescar = useCallback(async () => {
    try {
      setData(await obtenerProgresoAdmin());
    } catch (e) {
      if (isNoActiveRoundError(e)) {
        setData(null);
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const sessionUser = await obtenerMiSesion();
        if (sessionUser.tipo === "ADMIN") setIsAdmin(true);
      } catch {
        // Sin sesion admin: se queda en la vista de login.
      }
    })();
  }, []);

  // Conexion en vivo por SSE: el backend empuja el snapshot completo.
  useEffect(() => {
    if (!isAdmin) return;

    return suscribirProgresoAdmin({
      onProgreso: (payload) => {
        setData(payload);
        setError("");
      },
      onSinRonda: () => setData(null),
      onEstado: setEnVivo,
    });
  }, [isAdmin]);

  // Respaldo: si el stream se cae, se vuelve a consultar cada 5s.
  useEffect(() => {
    if (!isAdmin || enVivo) return;

    refrescar();
    const id = window.setInterval(refrescar, 5000);
    return () => window.clearInterval(id);
  }, [isAdmin, enVivo, refrescar]);

  // Aviso cuando alguien canta bingo mientras miras el panel.
  useEffect(() => {
    const bingos = data?.kpis.bingos ?? null;
    if (bingos === null) {
      bingosPrevios.current = null;
      return;
    }
    if (bingosPrevios.current !== null && bingos > bingosPrevios.current) {
      const nuevos = bingos - bingosPrevios.current;
      setAviso(`${nuevos} bingo${nuevos > 1 ? "s" : ""} nuevo${nuevos > 1 ? "s" : ""}!`);
      window.setTimeout(() => setAviso(""), 6000);
    }
    bingosPrevios.current = bingos;
  }, [data?.kpis.bingos]);

  async function handleIngresar() {
    setLoading(true);
    setError("");
    try {
      const user = await loginPorCodigo(codigo.trim().toUpperCase());
      if (user.tipo !== "ADMIN") {
        setError("Ese codigo no pertenece a una cuenta ADMIN");
        return;
      }
      setIsAdmin(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo ingresar");
    } finally {
      setLoading(false);
    }
  }

  async function handleCrearRonda() {
    setCreatingRonda(true);
    setError("");
    try {
      const r = await crearNuevaRondaAdmin();
      setAviso(`Ronda creada con ${r.totalParticipantes} cartillas.`);
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear ronda");
    } finally {
      setCreatingRonda(false);
    }
  }

  async function handleFinalizarRonda() {
    setEndingRonda(true);
    setError("");
    try {
      await finalizarRondaAdmin();
      setData(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo finalizar ronda");
    } finally {
      setEndingRonda(false);
    }
  }

  async function confirmarEliminacion() {
    if (!pending) return;
    setDeleting(true);
    setError("");
    try {
      if (pending.tipo === "usuario") {
        const r = await eliminarUsuarioAdmin(pending.usuario.usuarioId);
        setAviso(`${r.usuario.nombre} eliminado.`);
      } else {
        const r = await eliminarTodosLosParticipantesAdmin();
        setAviso(`${r.usuariosEliminados} participantes eliminados.`);
      }
      setPending(null);
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  }

  if (!isAdmin) {
    return (
      <main className="io-bg font-display flex min-h-screen items-center justify-center px-4 py-8">
        <section className="io-card w-full max-w-[460px] rounded-[36px] px-8 py-11">
          <div className="flex justify-center">
            <IoBadge size={34} />
          </div>
          <h1 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-[#1f1f1f]">
            Admin View
          </h1>
          <p className="mt-2 text-center text-xs text-[#5f6368]">
            Ingresa un codigo de usuario ADMIN
          </p>
          <div className="mt-8">
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && codigo.trim() && !loading)
                  handleIngresar();
              }}
              maxLength={4}
              placeholder="Codigo admin"
              className="w-full rounded-2xl border-2 border-[#e2d7f5] bg-white px-4 py-4 text-center text-base font-semibold uppercase tracking-[0.2em] text-[#1f1f1f] outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-[#9aa0a6] focus:border-[var(--io-purple)]"
            />
          </div>
          <button
            type="button"
            onClick={handleIngresar}
            disabled={!codigo.trim() || loading}
            className="io-gradient mt-5 w-full rounded-2xl px-6 py-4 text-lg font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-purple-500/30 transition hover:brightness-105 disabled:opacity-45 disabled:shadow-none"
          >
            {loading ? "Validando..." : "Ingresar"}
          </button>
          {error && (
            <p className="mt-5 rounded-xl bg-[#fce8e6] px-4 py-3 text-center text-xs font-medium text-[#c5221f]">
              {error}
            </p>
          )}
        </section>
      </main>
    );
  }

  const kpis = data?.kpis;

  return (
    <main className="io-bg font-display min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {/* Cabecera */}
        <section className="io-card rounded-[28px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-[#1f1f1f]">
                  Panel de Ronda
                </h1>
                <IoBadge size={26} />
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    enVivo
                      ? "bg-[#e6f4ea] text-[#137333]"
                      : "bg-[#fef7e0] text-[#b06000]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      enVivo ? "animate-pulse bg-[#34a853]" : "bg-[#f9ab00]"
                    }`}
                  />
                  {enVivo ? "En vivo" : "Reconectando"}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#5f6368]">
                {data ? `${data.ronda.nombre} (activa)` : "Sin ronda activa"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCrearRonda}
                disabled={creatingRonda}
                className="io-gradient rounded-full px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-500/25 transition hover:brightness-105 disabled:opacity-50"
              >
                {creatingRonda ? "Creando..." : "Crear otra ronda"}
              </button>
              <button
                type="button"
                onClick={handleFinalizarRonda}
                disabled={endingRonda || !data}
                className="rounded-full border border-[#dadce0] bg-white px-4 py-2 text-xs font-semibold text-[#5f6368] transition hover:bg-[#f1f3f4] disabled:opacity-50"
              >
                {endingRonda ? "Finalizando..." : "Finalizar ronda"}
              </button>
              <button
                type="button"
                onClick={() => setPending({ tipo: "todos" })}
                className="rounded-full border border-[#f3c6c3] bg-white px-4 py-2 text-xs font-semibold text-[#c5221f] transition hover:bg-[#fce8e6]"
              >
                Eliminar participantes
              </button>
            </div>
          </div>

          {aviso && (
            <p className="mt-4 rounded-xl bg-[#e6f4ea] px-4 py-3 text-xs font-semibold text-[#137333]">
              {aviso}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-xl bg-[#fce8e6] px-4 py-3 text-xs font-medium text-[#c5221f]">
              {error}
            </p>
          )}
        </section>

        {/* KPIs */}
        {kpis && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              label="Participantes"
              value={kpis.totalParticipantes}
              tone="blue"
            />
            <Kpi label="Bingos" value={kpis.bingos} tone="green" destacado />
            <Kpi label="En juego" value={kpis.enJuego} tone="yellow" />
            <Kpi
              label="Avance promedio"
              value={`${kpis.avancePromedio}%`}
              tone="purple"
            />
          </section>
        )}

        {/* Participantes */}
        <section className="io-card rounded-[28px] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1f1f1f]">Participantes</h2>
            {kpis && (
              <p className="text-[11px] text-[#5f6368]">
                {kpis.sinEmpezar} sin empezar &middot; {kpis.firmasTotales}{" "}
                firmas
              </p>
            )}
          </div>

          {!data && (
            <p className="mt-6 text-center text-xs text-[#5f6368]">
              No hay ronda activa. Crea una para repartir cartillas.
            </p>
          )}

          <div className="mt-4 space-y-2.5">
            {data?.participantes.map((item) => {
              const pct = item.totalCasillas
                ? (item.firmas / item.totalCasillas) * 100
                : 0;
              return (
                <div
                  key={item.usuarioId}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                    item.completas
                      ? "border-[#a8dab5] bg-[#e6f4ea]"
                      : "border-white/70 bg-white/80"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[#1f1f1f]">
                        {item.nombre}
                      </p>
                      {item.completas && (
                        <span className="shrink-0 rounded-full bg-[#34a853] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Bingo
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#5f6368]">
                      Codigo:{" "}
                      <span className="font-bold tracking-[0.18em] text-[var(--io-purple)]">
                        {item.codigo}
                      </span>
                    </p>
                    <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-black/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.completas ? "bg-[#34a853]" : "io-gradient"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <p className="shrink-0 text-xs font-bold text-[#1f1f1f]">
                    {item.progreso}
                  </p>

                  <button
                    type="button"
                    onClick={() => setPending({ tipo: "usuario", usuario: item })}
                    aria-label={`Eliminar a ${item.nombre}`}
                    title={`Eliminar a ${item.nombre}`}
                    className="shrink-0 rounded-full border border-[#f3c6c3] bg-white px-3 py-1.5 text-xs font-bold text-[#c5221f] transition hover:bg-[#fce8e6]"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Confirmacion de borrado */}
      {pending && (
        <section className="fixed inset-0 z-30 flex items-center justify-center bg-[#1f1f1f]/55 px-4 backdrop-blur-sm">
          <div className="io-card-solid w-full max-w-[420px] rounded-[28px] px-7 py-8">
            <h3 className="text-lg font-bold text-[#1f1f1f]">
              {pending.tipo === "usuario"
                ? `Eliminar a ${pending.usuario.nombre}?`
                : "Eliminar a todos los participantes?"}
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-[#5f6368]">
              {pending.tipo === "usuario" ? (
                <>
                  Se borra su cartilla y todas sus firmas. Ojo: tambien se
                  anulan las firmas que dio con su codigo{" "}
                  <span className="font-bold text-[var(--io-purple)]">
                    {pending.usuario.codigo}
                  </span>
                  , asi que el avance de otras personas puede bajar.
                </>
              ) : (
                <>
                  Se borran todos los participantes con sus cartillas y firmas.
                  Las cuentas ADMIN, las preguntas y las rondas se conservan.
                  Esta accion no se puede deshacer.
                </>
              )}
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={deleting}
                className="flex-1 rounded-2xl border border-[#dadce0] bg-white py-3 text-xs font-semibold text-[#5f6368] transition hover:bg-[#f1f3f4] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminacion}
                disabled={deleting}
                className="flex-1 rounded-2xl bg-[#c5221f] py-3 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Si, eliminar"}
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

const TONOS = {
  blue: "text-[var(--io-blue)]",
  green: "text-[#137333]",
  yellow: "text-[#b06000]",
  purple: "text-[var(--io-purple)]",
} as const;

function Kpi({
  label,
  value,
  tone,
  destacado = false,
}: {
  label: string;
  value: number | string;
  tone: keyof typeof TONOS;
  destacado?: boolean;
}) {
  return (
    <div
      className={`io-card rounded-[22px] px-4 py-4 ${
        destacado ? "ring-2 ring-[#34a853]/40" : ""
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5f6368]">
        {label}
      </p>
      <p className={`mt-1.5 text-3xl font-extrabold ${TONOS[tone]}`}>{value}</p>
    </div>
  );
}

function isNoActiveRoundError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("no hay ronda activa") || message.includes("error 404")
  );
}

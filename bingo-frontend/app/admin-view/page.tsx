 "use client";

import {
  AdminProgresoResponse,
  crearNuevaRondaAdmin,
  finalizarRondaAdmin,
  loginPorCodigo,
  obtenerMiSesion,
  obtenerProgresoAdmin,
} from "@/lib/api";
import { useEffect, useState } from "react";

export default function AdminViewPage() {
  const [codigo, setCodigo] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingRonda, setCreatingRonda] = useState(false);
  const [endingRonda, setEndingRonda] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AdminProgresoResponse | null>(null);

  useEffect(() => {
    tryLoadAdminData();
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const progress = await obtenerProgresoAdmin();
        setData(progress);
      } catch (e) {
        if (isNoActiveRoundError(e)) {
          setData(null);
          return;
        }
        setError(e instanceof Error ? e.message : "No se pudo actualizar progreso");
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [isAdmin]);

  async function tryLoadAdminData() {
    try {
      const sessionUser = await obtenerMiSesion();
      if (sessionUser.tipo !== "ADMIN") {
        return;
      }

      setIsAdmin(true);
      setError("");

      try {
        const progress = await obtenerProgresoAdmin();
        setData(progress);
      } catch (e) {
        if (isNoActiveRoundError(e)) {
          setData(null);
          return;
        }
        throw e;
      }
    } catch {
      // Si no hay sesión admin, queda en vista de login.
    }
  }

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
      try {
        const progress = await obtenerProgresoAdmin();
        setData(progress);
      } catch (e) {
        if (isNoActiveRoundError(e)) {
          setData(null);
          return;
        }
        throw e;
      }
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
      await crearNuevaRondaAdmin();
      const progress = await obtenerProgresoAdmin();
      setData(progress);
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

  if (!isAdmin) {
    return (
      <main className="font-arcade flex min-h-screen items-center justify-center bg-[#0B3CB7] px-4 py-6">
        <section className="w-full max-w-[460px] rounded-[34px] px-8 py-12">
          <h1 className="text-center text-3xl text-white">Admin View</h1>
          <p className="mt-3 text-center text-xs text-[#B7FFEB]">
            Ingresa un codigo de usuario ADMIN
          </p>
          <div className="mt-8">
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="Codigo admin"
              className="w-full rounded-xl border-2 border-[#3CE0B8] bg-white px-4 py-4 text-center text-base text-[#103A9E] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleIngresar}
            disabled={!codigo.trim() || loading}
            className="mt-8 w-full rounded-xl bg-[#33D7AF] px-6 py-4 text-xl uppercase text-white disabled:opacity-50"
          >
            {loading ? "Validando..." : "Ingresar"}
          </button>
          {error && <p className="mt-5 text-center text-xs text-[#B7FFEB]">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="font-arcade min-h-screen bg-[#0B3CB7] px-4 py-8 text-white">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-white/20 bg-[#1247C4] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl">Panel de Ronda</h1>
            <p className="mt-2 text-xs text-[#B7FFEB]">
              {data ? `${data.ronda.nombre} (activa)` : "Sin ronda activa"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCrearRonda}
            disabled={creatingRonda}
            className="rounded-lg bg-[#33D7AF] px-4 py-2 text-xs text-white disabled:opacity-50"
          >
            {creatingRonda ? "Creando..." : "Crear otra ronda"}
          </button>
          <button
            type="button"
            onClick={handleFinalizarRonda}
            disabled={endingRonda}
            className="rounded-lg bg-[#E53935] px-4 py-2 text-xs text-white disabled:opacity-50"
          >
            {endingRonda ? "Finalizando..." : "Finalizar ronda"}
          </button>
        </div>

        {error && <p className="mt-4 text-xs text-[#B7FFEB]">{error}</p>}

        <div className="mt-6 space-y-3">
          {data?.participantes.map((item) => (
            <div
              key={item.usuarioId}
              className="flex items-center justify-between rounded-xl border border-white/20 bg-[#0D3AA8] px-4 py-3"
            >
              <div>
                <p className="text-sm">{item.nombre}</p>
                <p className="text-[10px] text-[#B7FFEB]">Codigo: {item.codigo}</p>
              </div>
              <p className="text-sm">{item.progreso}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function isNoActiveRoundError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("no hay ronda activa") || message.includes("error 404");
}


"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { auth, errorMessage, publicApi } from "@/lib/api";
import { safeNext, useSession } from "@/lib/session";
import { sfx } from "@/lib/sfx";
import type { EventView } from "@/lib/types";
import { BingoWordmark, GdgLogo } from "@/components/Brand";
import { Loading } from "@/components/ui/Blocks";

/**
 * La primera pantalla de la app, y la unica puerta.
 *
 * Si el usuario no existe, la cuenta se crea con esa clave; si existe, se
 * valida. Sin correo, sin pantalla de registro aparte y sin elegir entre
 * "entrar" o "crear cuenta": en la puerta de un evento cada toque de mas es
 * una persona menos que llega a jugar. El rol de la cuenta decide a donde va:
 * un admin cae en su panel, un jugador en la plaza.
 */
function Entrar() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/lobby");
  const { status, me, refresh } = useSession();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [live, setLive] = useState<{ event: EventView | null; players: number } | null>(null);

  useEffect(() => {
    publicApi
      .event()
      .then(setLive)
      .catch(() => setLive(null));
  }, []);

  useEffect(() => {
    if (status !== "ready" || !me) return;
    if (me.player.role === "ADMIN") router.replace("/admin");
    else if (!me.player.skin) router.replace("/personaje");
    else router.replace(next);
  }, [status, me, router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { player } = await auth.entrar(usuario.trim(), clave);
      sfx.ok();
      await refresh();
      if (player.role === "ADMIN") router.replace("/admin");
      else router.replace(player.skin ? next : "/personaje");
    } catch (err) {
      sfx.error();
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-5 py-8">
      <div className="flex flex-col items-center gap-3">
        <GdgLogo size={24} />
        <BingoWordmark size={52} />
      </div>

      {live?.event ? (
        <div
          className="card flex flex-col items-center px-5 py-3 text-center"
          style={{ background: "#34a853", color: "#fff" }}
        >
          <span className="flex items-center gap-2 text-[13px] font-black uppercase tracking-wider">
            <span className="blink block h-2.5 w-2.5 rounded-full bg-white" aria-hidden /> En vivo
          </span>
          <span className="mt-1 text-xl font-black leading-tight">{live.event.name}</span>
          <span className="text-[15px] font-bold opacity-90">{live.players} jugando ahora</span>
        </div>
      ) : (
        <p className="pill self-center">Proximo evento muy pronto</p>
      )}

      <form onSubmit={submit} className="card p-6">
        <label htmlFor="usuario" className="block text-[15px] font-black uppercase tracking-wide text-muted">
          Tu usuario
        </label>
        <input
          id="usuario"
          className="input mt-2"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          maxLength={20}
          placeholder="Como quieres que te vean"
          autoCapitalize="none"
          autoComplete="username"
          required
          autoFocus
        />

        <label htmlFor="clave" className="mt-5 block text-[15px] font-black uppercase tracking-wide text-muted">
          Tu clave de 4 numeros
        </label>
        <input
          id="clave"
          className="input input-code mt-2"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          placeholder="----"
          value={clave}
          onChange={(e) => setClave(e.target.value.replace(/\D/g, "").slice(0, 8))}
          required
        />

        {error && (
          <p className="mt-4 text-center text-[16px] font-bold text-gred" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-blue btn-lg mt-6 w-full"
          disabled={busy || usuario.trim().length < 2 || clave.length < 4}
        >
          {busy ? "Entrando..." : "Entrar"}
        </button>

        <p className="mt-4 text-center text-[15px] font-semibold text-muted">
          Si es tu primera vez, tu cuenta se crea sola.
        </p>
      </form>

      <p className="text-center text-[15px] text-muted">
        Olvidaste tu clave? Pidesela al staff: no pierdes tus puntos ni tus misiones.
      </p>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Entrar />
    </Suspense>
  );
}

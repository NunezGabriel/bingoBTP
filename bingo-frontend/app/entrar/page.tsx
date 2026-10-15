"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { auth, errorMessage } from "@/lib/api";
import { safeNext, useSession } from "@/lib/session";
import { sfx } from "@/lib/sfx";
import { BingoWordmark } from "@/components/Brand";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Blocks";

/**
 * Una sola puerta para todos.
 *
 * Si el usuario no existe, la cuenta se crea con esa clave; si existe, se
 * valida. Sin correo, sin pantalla de registro aparte y sin elegir entre
 * "entrar" o "crear cuenta": en la puerta de un evento cada toque de mas es
 * una persona menos que llega a jugar.
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
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-5">
      <Link href="/" className="self-start p-2 text-muted" aria-label="Volver">
        <Icon name="back" size={20} />
      </Link>

      <div className="mt-2">
        <BingoWordmark size={38} />
      </div>

      <form onSubmit={submit} className="card mt-7 p-5">
        <h1 className="text-2xl font-extrabold">Entrar</h1>
        <p className="mt-1 text-[15px] text-muted">
          Elige un usuario y una clave de 4 numeros. Si es tu primera vez, tu cuenta se crea sola.
        </p>

        <label htmlFor="usuario" className="mt-5 block text-[13px] font-extrabold uppercase text-muted">
          Usuario
        </label>
        <input
          id="usuario"
          className="input mt-1"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          maxLength={20}
          placeholder="Como quieres que te vean"
          autoCapitalize="none"
          autoComplete="username"
          required
          autoFocus
        />

        <label htmlFor="clave" className="mt-4 block text-[13px] font-extrabold uppercase text-muted">
          Clave
        </label>
        <input
          id="clave"
          className="input input-code mt-1"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          placeholder="----"
          value={clave}
          onChange={(e) => setClave(e.target.value.replace(/\D/g, "").slice(0, 8))}
          required
        />

        {error && (
          <p className="mt-3 font-semibold text-gred" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-blue btn-lg mt-5 w-full"
          disabled={busy || usuario.trim().length < 2 || clave.length < 4}
        >
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-5 text-center text-[15px] text-muted">
        Olvidaste tu clave? Pidele al staff que te la reinicie: no pierdes tus puntos ni tus misiones.
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

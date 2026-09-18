"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { auth, errorMessage } from "@/lib/api";
import { safeNext, useSession } from "@/lib/session";
import { sfx } from "@/lib/sfx";
import { Logo } from "@/components/pixel/Brand";
import { PixelIcon } from "@/components/pixel/Sprite";
import { Loading } from "@/components/ui/Blocks";

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { status, refresh } = useSession();
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (status === "ready") router.replace(next);
  }, [status, router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    sfx.unlock();
    setBusy(true);
    setError("");
    try {
      await auth.login(nickname.trim(), pin);
      sfx.coin();
      await refresh();
      router.replace(next);
    } catch (err) {
      sfx.error();
      setError(errorMessage(err));
      setShake(true);
      window.setTimeout(() => setShake(false), 260);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-6">
      <Link href="/" className="self-start p-2 text-muted hover:text-cream" aria-label="Volver">
        <PixelIcon name="back" size={18} />
      </Link>
      <div className="mt-4">
        <Logo size="sm" />
      </div>

      <form onSubmit={submit} className={`px-box mt-8 p-5 ${shake ? "px-shake" : ""}`}>
        <h1 className="font-pixel text-[13px] text-gyellow">Continuar partida</h1>
        <p className="mt-1 text-[16px] text-muted">Entra con tu nombre de jugador y tu PIN.</p>

        <label className="font-pixel mt-5 block text-[9px] text-muted" htmlFor="nick">
          Nombre de jugador
        </label>
        <input
          id="nick"
          className="px-input mt-1"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="username"
          maxLength={16}
          required
          autoFocus
        />

        <label className="font-pixel mt-4 block text-[9px] text-muted" htmlFor="pin">
          PIN
        </label>
        <input
          id="pin"
          className="px-input px-input-code mt-1"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          inputMode="numeric"
          type="password"
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="mt-3 text-[16px] text-gred" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="px-btn px-btn-yellow px-btn-lg mt-5 w-[calc(100%-8px)]" disabled={busy || !nickname || pin.length < 4}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-5 text-center text-[16px] text-muted">
        Olvidaste tu PIN? Pidele al staff que lo reinicie: tu progreso no se pierde.
      </p>
      <p className="mt-2 text-center text-[16px] text-muted">
        Primera vez?{" "}
        <Link href={`/crear${next !== "/inicio" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-gyellow underline">
          Crea tu personaje
        </Link>
      </p>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Login />
    </Suspense>
  );
}

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

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { status, refresh } = useSession();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "ready") router.replace(next);
  }, [status, router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.login(name.trim(), pin);
      sfx.ok();
      await refresh();
      router.replace(next);
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
        <p className="mt-1 text-[15px] text-muted">Con el nombre y el PIN que usaste al crear tu cartilla.</p>

        <label htmlFor="name" className="mt-5 block text-[13px] font-extrabold uppercase text-muted">
          Tu nombre
        </label>
        <input
          id="name"
          className="input mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoCapitalize="words"
          autoComplete="nickname"
          required
          autoFocus
        />

        <label htmlFor="pin" className="mt-4 block text-[13px] font-extrabold uppercase text-muted">
          PIN
        </label>
        <input
          id="pin"
          className="input mt-1"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          required
        />

        {error && (
          <p className="mt-3 font-semibold text-gred" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-blue btn-lg mt-5 w-full" disabled={busy || !name || pin.length < 4}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-5 text-center text-[15px] text-muted">
        Olvidaste tu PIN? Pidele al staff que te lo reinicie: no pierdes tus puntos.
      </p>
      <p className="mt-2 text-center text-[15px] text-muted">
        Primera vez?{" "}
        <Link href="/crear" className="font-bold text-gblue underline">
          Crea tu cartilla
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

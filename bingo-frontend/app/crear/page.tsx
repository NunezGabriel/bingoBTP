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

const NAME_RE = /^[\p{L}\p{N} _.-]{2,20}$/u;

function CreateAccount() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { status, refresh } = useSession();

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [taken, setTaken] = useState<{ name: string; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "ready") router.replace(next);
  }, [status, router, next]);

  const clean = name.trim().replace(/\s+/g, " ");
  const nameOk = NAME_RE.test(clean);

  // El nombre se consulta con espera para no pegarle al servidor en cada tecla.
  useEffect(() => {
    if (!nameOk) return;
    const t = window.setTimeout(() => {
      auth
        .checkName(clean)
        .then((r) => setTaken(r.available ? null : { name: clean, reason: r.reason ?? "No disponible" }))
        .catch(() => {});
    }, 400);
    return () => window.clearTimeout(t);
  }, [clean, nameOk]);

  const nameTaken = taken?.name === clean;
  const pinOk = /^\d{4,8}$/.test(pin) && pin === pin2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameOk || !pinOk || busy) return;
    setBusy(true);
    setError("");
    try {
      await auth.register(clean, pin);
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
        <h1 className="text-2xl font-extrabold">Crear mi cartilla</h1>
        <p className="mt-1 text-[15px] text-muted">Con tu nombre y un PIN vuelves a entrar desde cualquier celular.</p>

        <label htmlFor="name" className="mt-5 block text-[13px] font-extrabold uppercase text-muted">
          Tu nombre
        </label>
        <input
          id="name"
          className="input mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como te dicen"
          maxLength={20}
          autoCapitalize="words"
          autoComplete="nickname"
          autoFocus
        />
        <p className="mt-1 min-h-[20px] text-[13px] font-semibold" style={{ color: nameTaken ? "#ea4335" : "#6b6b6b" }}>
          {nameTaken ? taken?.reason : clean && !nameOk ? "2 a 20 letras o numeros" : " "}
        </p>

        <label htmlFor="pin" className="mt-2 block text-[13px] font-extrabold uppercase text-muted">
          PIN (4 a 8 digitos)
        </label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <input
            id="pin"
            className="input"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
          <input
            className="input"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="Repite el PIN"
            aria-label="Repite el PIN"
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
        </div>
        {pin2.length >= 4 && pin !== pin2 && (
          <p className="mt-2 text-[13px] font-semibold text-gred">Los PIN no coinciden</p>
        )}

        {error && <p className="mt-3 font-semibold text-gred">{error}</p>}

        <button type="submit" className="btn btn-blue btn-lg mt-5 w-full" disabled={busy || !nameOk || nameTaken || !pinOk}>
          {busy ? "Creando..." : "Empezar a jugar"}
        </button>
      </form>

      <p className="mt-5 text-center text-[15px] text-muted">
        Ya tienes cuenta?{" "}
        <Link href="/entrar" className="font-bold text-gblue underline">
          Entra aqui
        </Link>
      </p>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CreateAccount />
    </Suspense>
  );
}

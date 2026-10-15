"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { errorMessage, me as meApi } from "@/lib/api";
import { safeNext, useSession } from "@/lib/session";
import type { Skin } from "@/lib/types";
import { BingoWordmark } from "@/components/Brand";
import { SkinCanvas } from "@/components/SkinCanvas";
import { Loading } from "@/components/ui/Blocks";

function Picker() {
  const router = useRouter();
  const params = useSearchParams();
  const { status, me, refresh } = useSession();
  const [skins, setSkins] = useState<Skin[]>([]);
  const [elegido, setElegido] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const next = safeNext(params.get("next"), "/lobby");

  useEffect(() => {
    if (status === "guest") router.replace("/entrar");
    if (status === "ready" && me?.player.role === "ADMIN") router.replace("/admin");
  }, [status, me, router]);

  useEffect(() => {
    meApi
      .skins()
      .then((r) => {
        setSkins(r.skins);
        setElegido(r.skin ?? r.skins[0]?.id ?? null);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  async function guardar() {
    if (!elegido || busy) return;
    setBusy(true);
    setError("");
    try {
      await meApi.setSkin(elegido);
      await refresh();
      router.replace(next === "/personaje" ? "/lobby" : next);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (!skins.length) return <Loading label="Buscando personajes" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="text-[26px] font-black leading-tight">Elige tu personaje</h1>
        <p className="text-[15px] text-muted">Asi te van a ver los demas en la plaza.</p>
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {skins.map((skin) => {
          const activo = skin.id === elegido;
          return (
            <li key={skin.id}>
              <button
                type="button"
                onClick={() => setElegido(skin.id)}
                aria-pressed={activo}
                className={`flex w-full flex-col items-center gap-1 rounded-[20px] border-2 p-3 ${
                  activo ? "border-gblue bg-card" : "border-ink bg-card"
                }`}
                style={activo ? { boxShadow: "0 0 0 4px rgba(66,133,244,0.25)" } : undefined}
              >
                <SkinCanvas skin={skin.id} zoom={1.6} walking={activo} />
                <span className="text-[15px] font-extrabold">{skin.name}</span>
                <span className="text-center text-[12px] leading-tight text-muted">{skin.detail}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="text-center font-semibold text-gred">{error}</p>}

      <button type="button" className="btn btn-blue btn-lg w-full" onClick={guardar} disabled={busy || !elegido}>
        {busy ? "Guardando..." : "Entrar a la plaza"}
      </button>
    </div>
  );
}

export default function PersonajePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-6">
      <div className="self-center">
        <BingoWordmark size={32} />
      </div>
      <Suspense fallback={<Loading />}>
        <Picker />
      </Suspense>
    </main>
  );
}

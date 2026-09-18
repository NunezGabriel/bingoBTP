"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { auth, errorMessage, publicApi } from "@/lib/api";
import { safeNext, useSession } from "@/lib/session";
import { CLASS_BY_KEY, HOUSES, type ClassKey, type HouseKey } from "@/lib/sprites";
import { sfx } from "@/lib/sfx";
import { Avatar } from "@/components/pixel/Avatar";
import { PixelIcon } from "@/components/pixel/Sprite";
import { ClassGrid, HousePicker } from "@/components/game/CharacterPicker";
import { Loading } from "@/components/ui/Blocks";

const STEPS = ["Clase", "Casa", "Nombre", "PIN"] as const;
const NICK_RE = /^[\p{L}\p{N}_]{3,16}$/u;

function CreateCharacter() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { status, refresh } = useSession();

  const [step, setStep] = useState(0);
  const [cls, setCls] = useState<ClassKey>("esqueleto");
  const [house, setHouse] = useState<HouseKey>("azul");
  const [nickname, setNickname] = useState("");
  const [availability, setAvailability] = useState<{ nick: string; ok: boolean; msg: string } | null>(null);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [live, setLive] = useState<{ eventName: string; counts: Partial<Record<HouseKey, number>> } | null>(null);

  useEffect(() => {
    if (status === "ready") router.replace(next);
  }, [status, router, next]);

  // Cuantos hay en cada casa del evento abierto: se vuelve a pedir al llegar al paso de casas.
  useEffect(() => {
    if (step !== 1) return;
    publicApi
      .event()
      .then((r) =>
        setLive(
          r.event
            ? { eventName: r.event.name, counts: Object.fromEntries(r.houses.map((h) => [h.house, h.players])) }
            : null,
        ),
      )
      .catch(() => {});
  }, [step]);

  // El formato se valida al instante; la disponibilidad se consulta con espera
  // para no pegarle al servidor en cada tecla.
  const cleanNick = nickname.trim();
  const formatOk = NICK_RE.test(cleanNick);
  const nickState = !cleanNick
    ? null
    : !formatOk
      ? { ok: false, msg: "3 a 16 letras, numeros o _ (sin espacios)" }
      : availability?.nick === cleanNick
        ? availability
        : null;

  useEffect(() => {
    if (!formatOk) return;
    const t = window.setTimeout(() => {
      auth
        .nickname(cleanNick)
        .then((r) =>
          setAvailability({
            nick: cleanNick,
            ok: r.available,
            msg: r.available ? "Disponible" : (r.reason ?? "No disponible"),
          }),
        )
        .catch(() => {});
    }, 400);
    return () => window.clearTimeout(t);
  }, [cleanNick, formatOk]);

  const canNext =
    step === 0 ||
    step === 1 ||
    (step === 2 && nickState?.ok === true) ||
    (step === 3 && /^\d{4,8}$/.test(pin) && pin === pin2);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await auth.register({ nickname: nickname.trim(), pin, avatarClass: cls, avatarHouse: house });
      sfx.levelUp();
      await refresh();
      router.replace(next);
    } catch (e) {
      sfx.error();
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  function goNext() {
    sfx.unlock();
    sfx.click();
    if (step < STEPS.length - 1) setStep(step + 1);
    else void submit();
  }

  const def = CLASS_BY_KEY[cls];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step === 0 ? router.push("/") : setStep(step - 1))}
          className="p-2 text-muted hover:text-cream"
          aria-label="Atras"
        >
          <PixelIcon name="back" size={18} />
        </button>
        <ol className="flex gap-1" aria-label="Pasos">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className="font-pixel px-2 pb-[3px] pt-[5px] text-[8px]"
              style={{ background: i <= step ? "#fbbc04" : "#2a2a5a", color: i <= step ? "#14142b" : "#9f9fc7" }}
              aria-current={i === step ? "step" : undefined}
            >
              {i + 1}
            </li>
          ))}
        </ol>
        <span className="w-8" />
      </div>

      {/* vista previa siempre visible */}
      <div className="mt-4 flex flex-col items-center">
        <Avatar cls={cls} house={house} size={132} bob />
        <p className="font-pixel mt-2 text-[12px] text-cream">{nickname.trim() || def.name}</p>
        <p className="mt-1 text-[15px] text-muted">
          {def.name} · Casa {HOUSES[house].name}
        </p>
      </div>

      <section className="px-box mt-5 flex-1 p-4">
        {step === 0 && (
          <>
            <h2 className="font-pixel text-[12px] text-gyellow">Elige tu clase</h2>
            <p className="mt-1 min-h-[44px] text-[16px] text-cream">{def.lore}</p>
            <div className="mt-3">
              <ClassGrid value={cls} house={house} onChange={(c) => { sfx.click(); setCls(c); }} />
            </div>
            <p className="mt-3 text-[15px] text-muted">
              Las clases con candado son legendarias: se desbloquean subiendo de nivel.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-pixel text-[12px] text-gyellow">Elige tu casa</h2>
            <p className="mt-1 text-[16px] text-cream">
              Tus puntos tambien suman para tu casa. Al final se corona la Copa de Casas.
            </p>
            {live && (
              <p className="mt-2 text-[15px] text-muted">
                Asi van las casas en {live.eventName}. Si una tiene pocos miembros, ayudala.
              </p>
            )}
            <div className="mt-4">
              <HousePicker
                value={house}
                onChange={(h) => { sfx.click(); setHouse(h); }}
                counts={live?.counts}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-pixel text-[12px] text-gyellow">Tu nombre de jugador</h2>
            <p className="mt-1 text-[16px] text-cream">Asi te vera todo el mundo en el ranking.</p>
            <input
              className="px-input mt-4"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="ej. SkeletorDev"
              maxLength={16}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="username"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && canNext && goNext()}
            />
            <p
              className="font-pixel mt-2 min-h-[18px] text-[9px]"
              style={{ color: nickState ? (nickState.ok ? "#34a853" : "#ea4335") : "#9f9fc7" }}
            >
              {nickState?.msg ?? " "}
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-pixel text-[12px] text-gyellow">Crea tu PIN secreto</h2>
            <p className="mt-1 text-[16px] text-cream">
              Con tu nombre y este PIN recuperas tu personaje en cualquier celular. Anotalo.
            </p>
            <label className="font-pixel mt-4 block text-[9px] text-muted" htmlFor="pin">
              PIN (4 a 8 digitos)
            </label>
            <input
              id="pin"
              className="px-input px-input-code mt-1"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              type="password"
              autoComplete="new-password"
              autoFocus
            />
            <label className="font-pixel mt-3 block text-[9px] text-muted" htmlFor="pin2">
              Repite el PIN
            </label>
            <input
              id="pin2"
              className="px-input px-input-code mt-1"
              value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              type="password"
              autoComplete="new-password"
              onKeyDown={(e) => e.key === "Enter" && canNext && goNext()}
            />
            {pin2.length >= 4 && pin !== pin2 && (
              <p className="font-pixel mt-2 text-[9px] text-gred">Los PIN no coinciden</p>
            )}
          </>
        )}

        {error && <p className="mt-3 text-[16px] text-gred">{error}</p>}
      </section>

      <button
        type="button"
        className={`px-btn px-btn-lg mt-4 ${step === STEPS.length - 1 ? "px-btn-green" : "px-btn-yellow"}`}
        disabled={!canNext || busy}
        onClick={goNext}
      >
        {busy ? "Creando..." : step === STEPS.length - 1 ? "Entrar al mundo" : "Siguiente"}
      </button>

      <p className="mt-3 text-center text-[15px] text-muted">
        Ya tienes personaje?{" "}
        <Link href={`/entrar${next !== "/inicio" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-gyellow underline">
          Entra aqui
        </Link>
      </p>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CreateCharacter />
    </Suspense>
  );
}

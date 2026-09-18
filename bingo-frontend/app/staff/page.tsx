"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cleanCode, errorMessage, staff, type StaffCard } from "@/lib/api";
import { useSession } from "@/lib/session";
import { sfx } from "@/lib/sfx";
import type { StaffMission } from "@/lib/types";
import { Avatar } from "@/components/pixel/Avatar";
import { PixelIcon } from "@/components/pixel/Sprite";
import { ErrorBox, Loading, Pill } from "@/components/ui/Blocks";
import { useToast } from "@/components/ui/Toasts";

type Award = { id: number; nickname: string; mission: string; points: number };

export default function StaffPage() {
  const router = useRouter();
  const toast = useToast();
  const { status, me } = useSession();
  const [code, setCode] = useState("");
  const [card, setCard] = useState<StaffCard | null>(null);
  const [cardCode, setCardCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<Award[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (status === "guest") router.replace("/entrar?next=/staff");
  }, [status, router]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const data = await staff.player(code);
      setCard(data);
      setCardCode(code);
      setCode("");
      sfx.click();
    } catch (err) {
      setError(errorMessage(err));
      sfx.error();
    } finally {
      setLoading(false);
    }
  }

  async function award(mission: StaffMission) {
    if (!card) return;
    setBusy(mission.key);
    try {
      const r = await staff.award(cardCode, mission.key);
      sfx.coin();
      toast.success(`+${r.mission.points} para ${card.player.nickname}`, r.mission.title);
      setRecent((list) => [
        { id: Date.now(), nickname: card.player.nickname, mission: r.mission.title, points: r.mission.points },
        ...list.slice(0, 9),
      ]);
      setCard(await staff.player(cardCode));
    } catch (err) {
      sfx.error();
      toast.error("No se entrego", errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (status === "loading" || status === "guest") return <Loading />;
  if (!me || (me.player.role !== "STAFF" && me.player.role !== "ADMIN")) {
    return (
      <main className="mx-auto max-w-md p-4">
        <ErrorBox message="Esta pantalla es solo para el staff del evento." />
        <Link href="/inicio" className="px-btn px-btn-dark mt-3">Volver</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-3 pb-10 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/inicio" className="p-2 text-muted" aria-label="Volver">
          <PixelIcon name="back" size={18} />
        </Link>
        <h1 className="font-pixel text-[13px] text-gyellow">DAR PUNTOS</h1>
        <span className="w-8" />
      </div>

      {!me.event ? (
        <ErrorBox message="No hay un evento abierto." />
      ) : !card ? (
        <form onSubmit={lookup} className="px-box p-4">
          <label htmlFor="staff-code" className="font-pixel block text-[10px] text-gyellow">
            CODIGO DEL JUGADOR
          </label>
          <p className="mt-1 text-[16px] text-muted">Pidele su codigo: sale en su pantalla de inicio.</p>
          <div className="mt-3 flex items-center">
            <input
              id="staff-code"
              className="px-input px-input-code flex-1"
              value={code}
              onChange={(e) => setCode(cleanCode(e.target.value))}
              placeholder="CODIGO"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
            <button type="submit" className="px-btn px-btn-yellow" disabled={loading || code.length !== 6}>
              Buscar
            </button>
          </div>
          {error && <p className="mt-2 text-center text-[17px] text-gred">{error}</p>}
        </form>
      ) : (
        <>
          <section className="px-box flex items-center gap-3 p-3">
            <Avatar cls={card.player.avatarClass} house={card.player.avatarHouse} tier={card.player.tier} size={64} />
            <div className="min-w-0 flex-1">
              <p className="font-pixel truncate text-[12px] text-cream">{card.player.nickname}</p>
              <p className="font-pixel mt-1 text-[11px] text-gold">{card.points} PTS</p>
            </div>
            <button type="button" className="px-btn px-btn-dark px-btn-sm" onClick={() => setCard(null)}>
              Otro
            </button>
          </section>

          <ul className="mt-1 flex flex-col">
            {card.missions.map((m) => {
              const done = !m.repeatable && m.timesAwarded > 0;
              return (
                <li key={m.key} className="px-box flex items-center gap-3 p-3" style={{ opacity: done ? 0.55 : 1 }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[18px] leading-tight text-cream">{m.title}</p>
                    {m.timesAwarded > 0 && (
                      <Pill color="#2657b8" className="mt-1">
                        {m.repeatable ? `YA ${m.timesAwarded}x` : "YA LA TIENE"}
                      </Pill>
                    )}
                  </div>
                  {done ? (
                    <span className="text-ggreen" aria-label="Ya la tiene">
                      <PixelIcon name="check" size={22} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="px-btn px-btn-green"
                      disabled={busy !== null}
                      onClick={() => award(m)}
                    >
                      +{m.points}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {recent.length > 0 && (
        <section className="px-box mt-3 p-3">
          <p className="font-pixel text-[9px] text-muted">ENTREGADOS EN ESTA SESION</p>
          <ul className="mt-2 flex flex-col gap-1">
            {recent.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 text-[15px]">
                <span className="truncate text-cream">
                  {r.nickname} · {r.mission}
                </span>
                <span className="font-pixel shrink-0 text-[9px] text-gold">+{r.points}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

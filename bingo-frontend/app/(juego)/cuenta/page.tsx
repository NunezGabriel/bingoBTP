"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, me as meApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import { isMuted, setMuted, sfx } from "@/lib/sfx";
import { HOUSES, type ClassKey } from "@/lib/sprites";
import type { HistoryEvent, TrophyKind } from "@/lib/types";
import { Avatar } from "@/components/pixel/Avatar";
import { PixelIcon } from "@/components/pixel/Sprite";
import type { IconName } from "@/components/pixel/icons";
import { Loading, PageTitle, Pill } from "@/components/ui/Blocks";
import { useToast } from "@/components/ui/Toasts";
import { ClassGrid, HousePicker } from "@/components/game/CharacterPicker";

const TROPHY: Record<TrophyKind, { label: string; color: string; icon: IconName }> = {
  CHAMPION: { label: "CAMPEON", color: "#ffd23f", icon: "crown" },
  PODIUM: { label: "PODIO", color: "#d3dbe6", icon: "trophy" },
  TOP10: { label: "TOP 10", color: "#d8894a", icon: "star" },
  PARTICIPANT: { label: "PARTICIPANTE", color: "#9f9fc7", icon: "flag" },
};

function day(date: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

export default function AccountPage() {
  const router = useRouter();
  const toast = useToast();
  const { me, refresh, logout } = useSession();
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [cls, setCls] = useState<ClassKey | null>(null);
  const [pins, setPins] = useState({ current: "", next: "" });
  const [muted, setMutedState] = useState(() => isMuted());
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    meApi
      .history()
      .then((h) => setEvents(h.events))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!me) return null;
  const p = me.player;
  const chosen = cls ?? p.avatarClass;

  async function saveClass() {
    setBusy(true);
    try {
      await meApi.avatar({ avatarClass: chosen });
      await refresh();
      setEditing(false);
      setCls(null);
      sfx.coin();
      toast.success("Personaje actualizado");
    } catch (e) {
      sfx.error();
      toast.error("No se pudo guardar", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function changePin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await meApi.pin(pins.current, pins.next);
      setPins({ current: "", next: "" });
      toast.success("PIN actualizado");
    } catch (err) {
      toast.error("No se cambio el PIN", errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <PageTitle icon="user" title="Mi cuenta" subtitle={`${p.nickname} · Casa ${HOUSES[p.avatarHouse].name}`} />

      <section className="px-box p-3">
        <p className="font-pixel text-[10px] text-cream">MIS EVENTOS</p>
        {!events ? (
          <Loading />
        ) : events.length === 0 ? (
          <p className="mt-2 text-[16px] text-muted">
            Aun no participaste en ningun evento. Al abrir la app durante un evento quedas inscrito.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {events.map((ev) => {
              const trophy = ev.trophy ? TROPHY[ev.trophy.kind] : null;
              return (
                <li key={ev.id} className="px-inset flex items-center gap-3 p-2">
                  <span style={{ color: trophy?.color ?? "#6e7385" }}>
                    <PixelIcon name={trophy?.icon ?? "flag"} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] leading-tight text-cream">{ev.name}</span>
                    <span className="text-[13px] text-muted">{day(ev.joinedAt)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    {ev.status === "LIVE" ? (
                      <Pill color="#34a853">EN CURSO</Pill>
                    ) : ev.finalRank ? (
                      <span className="font-pixel block text-[10px] text-cream">#{ev.finalRank}</span>
                    ) : null}
                    <span className="font-pixel mt-1 block text-[9px] text-gold">{ev.points} PTS</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="px-box p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-pixel text-[10px] text-cream">MI PERSONAJE</p>
          <button
            type="button"
            className="px-btn px-btn-dark px-btn-sm"
            onClick={() => {
              setEditing((v) => !v);
              setCls(null);
            }}
          >
            {editing ? "Cancelar" : "Cambiar"}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Avatar cls={chosen} house={p.avatarHouse} tier={p.tier} size={72} bob />
          <p className="text-[16px] text-muted">
            Nivel {p.level} · {p.progress.xp} XP de por vida
          </p>
        </div>
        {editing && (
          <>
            <div className="mt-3">
              <ClassGrid value={chosen} house={p.avatarHouse} level={p.level} onChange={setCls} />
            </div>
            {!me.event && (
              <>
                <p className="font-pixel mt-4 text-[9px] text-gyellow">CASA</p>
                <div className="mt-2">
                  <HousePicker
                    value={p.avatarHouse}
                    onChange={async (house) => {
                      try {
                        await meApi.avatar({ avatarHouse: house });
                        await refresh();
                        toast.success(`Ahora eres de la casa ${HOUSES[house].name}`);
                      } catch (e) {
                        toast.error("No se pudo cambiar", errorMessage(e));
                      }
                    }}
                  />
                </div>
              </>
            )}
            <button
              type="button"
              className="px-btn px-btn-green mt-3 w-[calc(100%-8px)]"
              disabled={busy || chosen === p.avatarClass}
              onClick={saveClass}
            >
              Guardar
            </button>
          </>
        )}
      </section>

      <form onSubmit={changePin} className="px-box p-3">
        <p className="font-pixel text-[10px] text-cream">CAMBIAR PIN</p>
        <div className="mt-2 grid grid-cols-2">
          <input
            className="px-input px-input-code"
            type="password"
            inputMode="numeric"
            placeholder="Actual"
            aria-label="PIN actual"
            autoComplete="current-password"
            value={pins.current}
            onChange={(e) => setPins({ ...pins, current: e.target.value.replace(/\D/g, "").slice(0, 8) })}
          />
          <input
            className="px-input px-input-code"
            type="password"
            inputMode="numeric"
            placeholder="Nuevo"
            aria-label="PIN nuevo"
            autoComplete="new-password"
            value={pins.next}
            onChange={(e) => setPins({ ...pins, next: e.target.value.replace(/\D/g, "").slice(0, 8) })}
          />
        </div>
        <button
          type="submit"
          className="px-btn px-btn-dark px-btn-sm mt-2"
          disabled={busy || pins.current.length < 4 || pins.next.length < 4}
        >
          Cambiar
        </button>
      </form>

      <button
        type="button"
        className="px-btn px-btn-dark"
        onClick={() => {
          setMuted(!muted);
          setMutedState(!muted);
          if (muted) sfx.click();
        }}
      >
        <PixelIcon name={muted ? "mute" : "sound"} size={14} /> Sonido: {muted ? "no" : "si"}
      </button>

      {p.role === "ADMIN" && (
        <Link href="/admin" className="px-btn px-btn-red">
          <PixelIcon name="cog" size={14} /> Panel admin
        </Link>
      )}
      {(p.role === "STAFF" || p.role === "ADMIN") && (
        <Link href="/staff" className="px-btn px-btn-green">
          <PixelIcon name="star" size={14} /> Dar puntos (staff)
        </Link>
      )}

      <button
        type="button"
        className="px-btn mt-2"
        onClick={async () => {
          await logout();
          router.replace("/");
        }}
      >
        <PixelIcon name="logout" size={14} /> Cerrar sesion
      </button>
      <p className="mb-2 text-center text-[14px] text-muted">
        Para volver solo necesitas tu nombre ({p.nickname}) y tu PIN.
      </p>
    </div>
  );
}

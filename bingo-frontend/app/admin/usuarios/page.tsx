"use client";

import { useCallback, useEffect, useState } from "react";
import { admin, errorMessage, type AdminUser } from "@/lib/api";
import { Card, ConfirmButton, TextInput } from "@/components/admin/Form";
import { Avatar, LevelTag } from "@/components/pixel/Avatar";
import { PixelIcon } from "@/components/pixel/Sprite";
import { Loading, Pill } from "@/components/ui/Blocks";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toasts";

export default function AdminUsersPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [onlyEvent, setOnlyEvent] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; hasMore: boolean; users: AdminUser[] } | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [pin, setPin] = useState("");

  const load = useCallback(
    (nextPage = 1) => {
      admin
        .users({ q, onlyEvent, page: nextPage })
        .then((r) =>
          setData((prev) =>
            nextPage === 1 || !prev
              ? { total: r.total, hasMore: r.hasMore, users: r.users }
              : { total: r.total, hasMore: r.hasMore, users: [...prev.users, ...r.users] },
          ),
        )
        .catch((e) => toast.error("No se cargaron", errorMessage(e)));
    },
    [q, onlyEvent, toast],
  );

  // Al cambiar la busqueda o el filtro se vuelve a empezar desde la pagina 1.
  useEffect(() => {
    const t = window.setTimeout(() => load(1), 250);
    return () => window.clearTimeout(t);
  }, [load]);

  async function act(action: () => Promise<unknown>, message: string, close = false) {
    try {
      await action();
      toast.success(message);
      load(1);
      if (close) setSelected(null);
    } catch (e) {
      toast.error("No se pudo", errorMessage(e));
    }
  }

  return (
    <>
      <Card title={`USUARIOS (${data?.total ?? "..."})`}>
        <TextInput
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre o codigo"
          aria-label="Buscar usuario"
        />
        <div className="mt-2 grid grid-cols-2">
          <button
            type="button"
            className={`px-btn px-btn-sm ${onlyEvent ? "px-btn-dark" : "px-btn-yellow"}`}
            onClick={() => {
              setOnlyEvent(false);
              setPage(1);
            }}
          >
            Todos
          </button>
          <button
            type="button"
            className={`px-btn px-btn-sm ${onlyEvent ? "px-btn-yellow" : "px-btn-dark"}`}
            onClick={() => {
              setOnlyEvent(true);
              setPage(1);
            }}
          >
            Del evento abierto
          </button>
        </div>

        {!data ? (
          <Loading />
        ) : data.users.length === 0 ? (
          <p className="mt-3 text-[16px] text-muted">Nadie coincide con esa busqueda.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {data.users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(u);
                    setPin("");
                  }}
                  className="px-inset flex w-full items-center gap-3 p-2 text-left"
                >
                  <Avatar cls={u.avatarClass} house={u.avatarHouse} tier={u.tier} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] text-cream">{u.nickname}</span>
                    <span className="font-pixel text-[9px] text-gyellow">{u.code}</span>
                  </span>
                  {u.role !== "PLAYER" && <Pill color={u.role === "ADMIN" ? "#a8261b" : "#2657b8"}>{u.role}</Pill>}
                  {u.eventPoints !== null && (
                    <span className="font-pixel shrink-0 text-[10px] text-gold">{u.eventPoints} pts</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {data?.hasMore && (
          <button
            type="button"
            className="px-btn px-btn-dark mt-2"
            onClick={() => {
              const next = page + 1;
              setPage(next);
              load(next);
            }}
          >
            Ver mas
          </button>
        )}
      </Card>

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.nickname}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar cls={selected.avatarClass} house={selected.avatarHouse} tier={selected.tier} size={64} />
              <div>
                <p className="font-pixel text-[12px] text-gyellow">{selected.code}</p>
                <div className="mt-1 flex items-center gap-2">
                  <LevelTag level={selected.level} />
                  <span className="text-[15px] text-muted">{selected.xp} XP</span>
                </div>
                {selected.eventPoints !== null && (
                  <p className="text-[15px] text-cream">{selected.eventPoints} pts en el evento abierto</p>
                )}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(() => admin.resetPin(selected.id, pin), `PIN nuevo: ${pin}. Diselo al jugador.`);
                setPin("");
              }}
            >
              <label className="font-pixel block text-[9px] text-muted" htmlFor="new-pin">
                SI OLVIDO SU PIN, PONLE UNO NUEVO
              </label>
              <div className="mt-1 flex items-center">
                <TextInput
                  id="new-pin"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  inputMode="numeric"
                  placeholder="4 a 8 digitos"
                />
                <button type="submit" className="px-btn px-btn-dark" disabled={pin.length < 4}>
                  Cambiar
                </button>
              </div>
            </form>

            {selected.role !== "ADMIN" && (
              <div className="flex flex-wrap gap-1">
                {selected.role === "PLAYER" ? (
                  <ConfirmButton
                    className="px-btn-green"
                    confirmLabel="Hacer staff?"
                    onConfirm={() => act(() => admin.setRole(selected.id, "STAFF"), `${selected.nickname} ahora es staff`, true)}
                  >
                    Hacer staff
                  </ConfirmButton>
                ) : (
                  <ConfirmButton
                    className="px-btn-dark"
                    confirmLabel="Quitar staff?"
                    onConfirm={() => act(() => admin.setRole(selected.id, "PLAYER"), `${selected.nickname} vuelve a ser jugador`, true)}
                  >
                    Quitar staff
                  </ConfirmButton>
                )}
                <ConfirmButton
                  confirmLabel="Borrar su cuenta?"
                  onConfirm={() => act(() => admin.deleteUser(selected.id), "Usuario eliminado", true)}
                >
                  <PixelIcon name="trash" size={12} /> Eliminar
                </ConfirmButton>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

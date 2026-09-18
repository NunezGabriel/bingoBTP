"use client";

import { useCallback, useEffect, useState } from "react";
import { cleanCode, errorMessage, me as meApi } from "@/lib/api";
import { useRealtime } from "@/lib/realtime";
import { useSession } from "@/lib/session";
import { sfx } from "@/lib/sfx";
import type { Contact } from "@/lib/types";
import { Avatar, LevelTag } from "@/components/pixel/Avatar";
import { PixelIcon } from "@/components/pixel/Sprite";
import { Empty, ErrorBox, Loading, PageTitle } from "@/components/ui/Blocks";
import { useToast } from "@/components/ui/Toasts";
import { PlayerCode } from "@/components/game/PlayerCode";

function since(date: string) {
  return new Date(date).toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

export default function ContactsPage() {
  const { me } = useSession();
  const toast = useToast();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(() => {
    meApi
      .contacts()
      .then((r) => {
        setContacts(r.contacts);
        setError("");
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("contact", load);
  useRealtime("bingo:signed", load);
  useRealtime("resync", load);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setFormError("");
    try {
      const r = await meApi.addContact(code);
      sfx.coin();
      toast.success(r.isNew ? "Contacto agregado" : "Ya eran contactos", r.player.nickname);
      setCode("");
      load();
    } catch (err) {
      sfx.error();
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!me) return null;

  return (
    <div>
      <PageTitle
        icon="users"
        title="Contactos"
        subtitle={contacts ? `${contacts.length} personas que conociste` : "La gente que conociste"}
      />

      <form onSubmit={add} className="px-box p-3">
        <label htmlFor="contact-code" className="font-pixel block text-[9px] text-gyellow">
          AGREGAR POR CODIGO
        </label>
        <div className="mt-2 flex items-center">
          <input
            id="contact-code"
            className="px-input px-input-code flex-1"
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            placeholder="CODIGO"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button type="submit" className="px-btn px-btn-yellow" disabled={busy || code.length !== 6}>
            Agregar
          </button>
        </div>
        {formError && <p className="mt-2 text-[16px] text-gred">{formError}</p>}
        <div className="mt-2">
          <PlayerCode code={me.player.code} compact />
        </div>
        <p className="mt-1 text-[14px] text-muted">Al firmarse el bingo tambien quedan como contactos.</p>
      </form>

      <div className="mt-2">
        {error ? (
          <ErrorBox message={error} onRetry={load} />
        ) : !contacts ? (
          <Loading />
        ) : contacts.length === 0 ? (
          <Empty icon="users" title="Aun no tienes contactos">
            Pidele su codigo a quien conozcas y agregalo aqui.
          </Empty>
        ) : (
          <ul className="flex flex-col">
            {contacts.map((c) => (
              <li key={c.player.id} className="px-box flex items-center gap-3 px-3 py-2">
                <Avatar cls={c.player.avatarClass} house={c.player.avatarHouse} tier={c.player.tier} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="font-pixel block truncate text-[10px] text-cream">{c.player.nickname}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <LevelTag level={c.player.level} />
                    <span className="truncate text-[14px] text-muted">{c.player.title}</span>
                  </span>
                </span>
                <span className="shrink-0 text-right text-[13px] leading-tight text-muted">
                  {c.eventName && <span className="block max-w-[110px] truncate">{c.eventName}</span>}
                  <span className="flex items-center justify-end gap-1">
                    <PixelIcon name="heart" size={10} className="text-gred" /> {since(c.since)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

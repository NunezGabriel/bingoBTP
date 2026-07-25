"use client";

import { useState } from "react";
import IoBadge from "@/components/ioBadge";

type StartViewProps = {
  onStart?: (playerName: string) => Promise<void> | void;
  loading?: boolean;
  errorMessage?: string;
};

const StartView = ({
  onStart,
  loading = false,
  errorMessage = "",
}: StartViewProps) => {
  const [name, setName] = useState("");

  const handleStart = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    onStart?.(cleanName);
  };

  return (
    <main className="io-bg font-display flex min-h-screen items-center justify-center px-4 py-8">
      <section className="io-card w-full max-w-[460px] rounded-[36px] px-8 py-11">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5f6368]">
            GDG Arequipa
          </p>

          <h1 className="mt-5 text-6xl font-extrabold tracking-tight text-[#1f1f1f]">
            Bingo
          </h1>

          <div className="mt-5 flex justify-center">
            <IoBadge size={44} />
          </div>

          <p className="mt-6 text-sm leading-relaxed text-[#5f6368]">
            Conoce gente, completa tus 9 casillas y canta bingo.
          </p>
        </div>

        <div className="mt-9">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleStart();
            }}
            placeholder="Dejanos tu nombre"
            className="w-full rounded-2xl border-2 border-[#e2d7f5] bg-white px-4 py-4 text-center text-base font-medium text-[#1f1f1f] outline-none transition placeholder:font-normal placeholder:text-[#9aa0a6] focus:border-[var(--io-purple)]"
            maxLength={25}
          />
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={!name.trim() || loading}
          className="io-gradient mt-5 w-full rounded-2xl px-6 py-4 text-xl font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-purple-500/30 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        >
          {loading ? "Creando..." : "Empezar"}
        </button>

        {errorMessage && (
          <p className="mt-5 rounded-xl bg-[#fce8e6] px-4 py-3 text-center text-xs font-medium text-[#c5221f]">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 flex items-center justify-center gap-2" aria-hidden>
          <span className="h-1.5 w-8 rounded-full bg-[var(--io-blue)]" />
          <span className="h-1.5 w-8 rounded-full bg-[var(--io-red)]" />
          <span className="h-1.5 w-8 rounded-full bg-[var(--io-yellow)]" />
          <span className="h-1.5 w-8 rounded-full bg-[var(--io-green)]" />
        </div>
      </section>
    </main>
  );
};

export default StartView;

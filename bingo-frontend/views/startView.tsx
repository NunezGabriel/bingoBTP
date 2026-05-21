"use client";

import { useState } from "react";

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
    <main className="font-arcade flex min-h-screen items-center justify-center bg-gradient-to-b from-black to-[#7B0000] px-4 py-6">
      <section className="w-full max-w-[460px] rounded-[34px] px-8 py-12">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white">
            GDG Arequipa
          </p>
          <h1 className="mt-4 text-6xl uppercase tracking-wide text-white">
            Bingo
          </h1>
          <p className="mt-3 text-3xl leading-snug text-[#FF3C3C]">
            Build With AI
          </p>
        </div>

        <div className="mt-12">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Dejanos tu nombre"
            className="w-full rounded-xl border-2 border-[#FF3C3C] bg-white px-4 py-4 text-center text-base text-[#7B0000] outline-none transition placeholder:text-[#9D5B5B] focus:border-white"
            maxLength={25}
          />
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={!name.trim() || loading}
          className="mt-12 w-full rounded-xl bg-[#E53232] px-6 py-5 text-4xl uppercase tracking-[0.15em] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creando..." : "Start"}
        </button>
        {errorMessage && (
          <p className="mt-6 text-center text-xs text-[#FFBBBB]">
            {errorMessage}
          </p>
        )}
      </section>
    </main>
  );
};

export default StartView;

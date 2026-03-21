"use client";

import { useState } from "react";

type StartViewProps = {
  onStart?: (playerName: string) => void;
};

const StartView = ({ onStart }: StartViewProps) => {
  const [name, setName] = useState("");

  const handleStart = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    onStart?.(cleanName);
  };

  return (
    <main className="font-arcade flex min-h-screen items-center justify-center bg-[#0B3CB7] px-4 py-6">
      <section className="w-full max-w-[460px] rounded-[34px] px-8 py-12">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white">
            Women Techmakers
          </p>
          <h1 className="mt-4 text-6xl uppercase tracking-wide text-white">
            Bingo
          </h1>
          <p className="mt-3 text-3xl leading-snug text-[#3CE0B8]">
            Break The Pattern
          </p>
          <p className="mt-3 text-xs text-white">IWD Arequipa 2026</p>
        </div>

        <div className="mt-12">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Dejanos tu nombre"
            className="w-full rounded-xl border-2 border-[#3CE0B8] bg-white px-4 py-4 text-center text-base text-[#103A9E] outline-none transition placeholder:text-[#5B6D9D] focus:border-white"
            maxLength={25}
          />
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={!name.trim()}
          className="mt-12 w-full rounded-xl bg-[#33D7AF] px-6 py-5 text-4xl uppercase tracking-[0.15em] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start
        </button>
      </section>
    </main>
  );
};

export default StartView;

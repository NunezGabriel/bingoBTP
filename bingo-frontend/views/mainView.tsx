"use client";

import confetti from "canvas-confetti";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cartilla } from "@/lib/api";
import IoBadge from "@/components/ioBadge";

type MainViewProps = {
  cartilla: Cartilla;
  playerName: string;
  playerCode: string;
  errorMessage?: string;
  onSignCell: (casillaId: number, codigoFirmador: string) => Promise<void>;
  onChangeUser: () => Promise<void>;
  loading?: boolean;
};

const CONFETTI_COLORS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853", "#7C4DFF"];

const MainView = ({
  cartilla,
  playerName,
  playerCode,
  onSignCell,
  onChangeUser,
  loading = false,
  errorMessage = "",
}: MainViewProps) => {
  const boardQuestions = useMemo(
    () =>
      cartilla.casillas.map((rel) => ({
        id: rel.casilla.id,
        numero: rel.casilla.numero,
        text: rel.casilla.pregunta,
      })),
    [cartilla.casillas],
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(
    null,
  );
  const [codeInput, setCodeInput] = useState("");
  const [localError, setLocalError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isBingoModalClosed, setIsBingoModalClosed] = useState(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const signedByCellId = useMemo(() => {
    const record: Record<number, boolean> = {};
    for (const firma of cartilla.firmas) {
      record[firma.casillaId] = true;
    }
    return record;
  }, [cartilla.firmas]);

  const completedCount = Object.keys(signedByCellId).length;
  const totalCells = boardQuestions.length;
  const isBingo = completedCount === totalCells;

  const selectedQuestion = boardQuestions.find(
    (question) => question.id === selectedQuestionId,
  );

  useEffect(() => {
    if (!isBingo || isBingoModalClosed || !confettiCanvasRef.current) return;

    const instance = confetti.create(confettiCanvasRef.current, {
      resize: true,
      useWorker: true,
    });

    const burst = () => {
      instance({
        particleCount: 90,
        spread: 90,
        startVelocity: 45,
        gravity: 0.9,
        origin: { x: 0.15, y: 0.65 },
        colors: CONFETTI_COLORS,
      });
      instance({
        particleCount: 90,
        spread: 90,
        startVelocity: 45,
        gravity: 0.9,
        origin: { x: 0.85, y: 0.65 },
        colors: CONFETTI_COLORS,
      });
    };

    burst();
  }, [isBingo, isBingoModalClosed]);

  const closeQuestionPanel = () => {
    setSelectedQuestionId(null);
    setCodeInput("");
    setLocalError("");
  };

  const handleValidateCode = async () => {
    if (!selectedQuestion) return;

    const normalizedCode = codeInput.trim().toUpperCase();
    const isFormatValid = /^[A-Z0-9]{4}$/.test(normalizedCode);

    if (!isFormatValid) {
      setLocalError("El codigo debe tener 4 caracteres (letras o numeros).");
      return;
    }
    if (normalizedCode === playerCode) {
      setLocalError("No puedes usar tu propio codigo.");
      return;
    }

    try {
      setIsValidating(true);
      await onSignCell(selectedQuestion.id, normalizedCode);
      closeQuestionPanel();
    } catch {
      // El error de backend se muestra desde props.
    } finally {
      setIsValidating(false);
    }
  };

  const progressPct = totalCells ? (completedCount / totalCells) * 100 : 0;

  return (
    <main className="io-bg font-display relative flex min-h-screen items-center justify-center px-4 py-8">
      <section className="io-card w-full max-w-[470px] rounded-[36px] px-7 py-9">
        <header className="text-center">
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#1f1f1f]">
              Bingo
            </h1>
            <IoBadge size={34} />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 text-left">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1f1f1f]">
                {playerName}
              </p>
              <p className="mt-0.5 text-[11px] text-[#5f6368]">
                Tu codigo:{" "}
                <span className="font-bold tracking-[0.18em] text-[var(--io-purple)]">
                  {playerCode}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onChangeUser}
              className="shrink-0 rounded-full border border-[#dadce0] bg-white px-3 py-2 text-[11px] font-medium text-[#5f6368] transition hover:bg-[#f1f3f4]"
            >
              Cambiar
            </button>
          </div>
        </header>

        <div className="mt-7 grid grid-cols-3 gap-3">
          {boardQuestions.map((question) => {
            const isDone = Boolean(signedByCellId[question.id]);
            return (
              <button
                key={question.id}
                type="button"
                disabled={isDone}
                onClick={() => {
                  setSelectedQuestionId(question.id);
                  setLocalError("");
                }}
                className={`flex h-20 items-center justify-center rounded-2xl text-3xl font-bold transition ${
                  isDone
                    ? "io-gradient cursor-not-allowed text-white shadow-md shadow-purple-500/25"
                    : "border-2 border-[#e6dcf7] bg-white text-[#1f1f1f] hover:-translate-y-0.5 hover:border-[var(--io-purple)] hover:shadow-lg"
                }`}
              >
                {isDone ? "✓" : question.numero}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-medium text-[#5f6368]">
            <span>Completadas</span>
            <span className="font-bold text-[#1f1f1f]">
              {completedCount}/{totalCells}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/80">
            <div
              className="io-gradient h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {isBingo && isBingoModalClosed && (
          <div className="mt-6 rounded-2xl border border-[#d7c5f5] bg-white/85 px-4 py-4 text-center">
            <p className="text-sm font-bold text-[var(--io-purple)]">
              Estado: EN ESPERA
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#5f6368]">
              Ya completaste tu bingo. Mantente cerca del staff para la
              validacion final y entrega de premio.
            </p>
          </div>
        )}
      </section>

      {selectedQuestion && (
        <section className="fixed inset-0 z-20 flex items-center justify-center bg-[#1f1f1f]/55 px-4 backdrop-blur-sm">
          <div className="io-card-solid w-full max-w-[470px] rounded-[32px] px-7 py-8">
            <div className="io-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-bold text-white">
              {selectedQuestion.numero}
            </div>
            <p className="mt-6 text-center text-lg font-semibold leading-relaxed text-[#1f1f1f]">
              {selectedQuestion.text}
            </p>

            <div className="mt-7 flex items-center gap-2 rounded-2xl border-2 border-[#e2d7f5] bg-white px-3 py-2 focus-within:border-[var(--io-purple)]">
              <input
                type="text"
                value={codeInput}
                onChange={(event) =>
                  setCodeInput(event.target.value.toUpperCase())
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleValidateCode();
                }}
                placeholder="Ingresa codigo"
                className="w-full bg-transparent px-1 py-2 text-base font-semibold uppercase tracking-[0.15em] text-[#1f1f1f] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-[#9aa0a6]"
                maxLength={4}
              />
              <button
                type="button"
                onClick={handleValidateCode}
                disabled={loading || isValidating}
                className="io-gradient shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-50"
              >
                {isValidating ? "..." : "OK"}
              </button>
            </div>

            {(localError || errorMessage) && (
              <p className="mt-4 rounded-xl bg-[#fce8e6] px-4 py-3 text-xs font-medium leading-relaxed text-[#c5221f]">
                {localError || errorMessage}
              </p>
            )}

            <button
              type="button"
              onClick={closeQuestionPanel}
              className="mt-5 w-full rounded-2xl border border-[#dadce0] bg-white py-3 text-xs font-semibold text-[#5f6368] transition hover:bg-[#f1f3f4]"
            >
              Cerrar
            </button>
          </div>
        </section>
      )}

      {isBingo && !isBingoModalClosed && (
        <section className="fixed inset-0 z-20 flex items-center justify-center bg-[#1f1f1f]/55 px-4 backdrop-blur-sm">
          <div className="io-card-solid relative w-full max-w-[470px] overflow-hidden rounded-[32px] px-7 py-12 text-center">
            <canvas
              ref={confettiCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
            <p className="io-gradient bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
              BINGO!
            </p>
            <p className="mt-4 text-base font-semibold text-[#1f1f1f]">
              Completaste todas las casillas.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#5f6368]">
              Acercate al staff para reclamar tu premio.
            </p>
            <div
              className="mt-6 flex items-center justify-center gap-2"
              aria-hidden
            >
              <span className="h-1.5 w-8 rounded-full bg-[var(--io-blue)]" />
              <span className="h-1.5 w-8 rounded-full bg-[var(--io-red)]" />
              <span className="h-1.5 w-8 rounded-full bg-[var(--io-yellow)]" />
              <span className="h-1.5 w-8 rounded-full bg-[var(--io-green)]" />
            </div>
            <button
              type="button"
              onClick={() => setIsBingoModalClosed(true)}
              className="relative mt-7 w-full rounded-2xl border border-[#dadce0] bg-white py-3 text-xs font-semibold text-[#5f6368] transition hover:bg-[#f1f3f4]"
            >
              Cerrar
            </button>
          </div>
        </section>
      )}
    </main>
  );
};

export default MainView;

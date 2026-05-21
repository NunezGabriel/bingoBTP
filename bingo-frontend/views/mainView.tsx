"use client";

import confetti from "canvas-confetti";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cartilla } from "@/lib/api";

type MainViewProps = {
  cartilla: Cartilla;
  playerName: string;
  playerCode: string;
  errorMessage?: string;
  onSignCell: (casillaId: number, codigoFirmador: string) => Promise<void>;
  onChangeUser: () => Promise<void>;
  loading?: boolean;
};

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
  const isBingo = completedCount === boardQuestions.length;

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
        colors: ["#E53232", "#FFFFFF", "#7B0000"],
      });
      instance({
        particleCount: 90,
        spread: 90,
        startVelocity: 45,
        gravity: 0.9,
        origin: { x: 0.85, y: 0.65 },
        colors: ["#E53232", "#FFFFFF", "#7B0000"],
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

  return (
    <main className="font-arcade relative flex min-h-screen items-center justify-center bg-gradient-to-b from-black to-[#7B0000] px-4 py-6">
      <section className="w-full max-w-[470px] rounded-[34px] px-7 py-10">
        <header className="text-center">
          <div className="flex items-center justify-center gap-3 text-6xl">
            <span className="text-[#FF3C3C]">B</span>
            <span className="text-[#FF3C3C]">W</span>
            <span className="rounded-xl bg-[#7B0000] px-5 py-2 text-white">
              AI
            </span>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-white">
            Hola, <span className="text-[#FFBBBB]">{playerName}</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white">
            Tu codigo: <span className="text-[#FF3C3C]">{playerCode}</span>
          </p>
          <button
            type="button"
            onClick={onChangeUser}
            className="mt-4 rounded-lg border border-white/50 bg-white/10 px-3 py-2 text-[10px] text-white hover:bg-white/20"
          >
            Cambiar usuario
          </button>
        </header>

        <div className="mt-8 grid grid-cols-3 gap-4">
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
                className={`h-20 rounded-xl border-2 text-4xl transition ${
                  isDone
                    ? "cursor-not-allowed border-[#E53232] bg-[#E53232] text-white"
                    : "border-white bg-white text-[#7B0000] hover:scale-[1.02]"
                }`}
              >
                {question.numero}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-white">
          Completadas: {completedCount}/9
        </p>
        {isBingo && isBingoModalClosed && (
          <div className="mt-7 rounded-2xl border-2 border-[#FF3C3C] bg-[#3A0000] px-4 py-4 text-center">
            <p className="text-sm text-[#FFBBBB]">Estado: EN ESPERA</p>
            <p className="mt-2 text-xs leading-relaxed text-white">
              Ya completaste tu bingo. Mantente cerca del staff para la
              validacion final y entrega de premio.
            </p>
          </div>
        )}
      </section>

      {selectedQuestion && (
        <section className="absolute inset-0 flex items-center justify-center bg-black/90 px-4">
          <div className="w-full max-w-[470px] rounded-[30px] border-2 border-[#C02020] bg-[#3A0000] px-7 py-9 shadow-2xl">
            <div className="mx-auto w-fit rounded-2xl bg-black px-7 py-4 text-6xl text-white">
              {selectedQuestion.numero}
            </div>
            <p className="mt-7 text-center text-lg leading-relaxed text-white">
              {selectedQuestion.text}
            </p>

            <div className="mt-7 flex items-center gap-2 rounded-xl border-2 border-[#FF3C3C] bg-white px-3 py-3">
              <input
                type="text"
                value={codeInput}
                onChange={(event) =>
                  setCodeInput(event.target.value.toUpperCase())
                }
                placeholder="Ingresa codigo"
                className="w-full bg-transparent text-base uppercase text-[#7B0000] outline-none placeholder:text-[#C47B7B]"
                maxLength={4}
              />
              <button
                type="button"
                onClick={handleValidateCode}
                disabled={loading || isValidating}
                className="rounded-lg bg-[#E53232] px-4 py-2 text-base text-white"
              >
                {isValidating ? "Validando..." : "OK"}
              </button>
            </div>

            {localError && (
              <p className="mt-4 text-xs leading-relaxed text-[#FFBBBB]">
                {localError}
              </p>
            )}
            {errorMessage && (
              <p className="mt-4 text-xs leading-relaxed text-[#FFBBBB]">
                {errorMessage}
              </p>
            )}

            <button
              type="button"
              onClick={closeQuestionPanel}
              className="mt-6 w-full rounded-xl border border-white/50 bg-white/10 py-3 text-xs text-white hover:bg-white/20"
            >
              Cerrar
            </button>
          </div>
        </section>
      )}

      {isBingo && !isBingoModalClosed && (
        <section className="absolute inset-0 flex items-center justify-center bg-black/90 px-4">
          <div className="relative w-full max-w-[470px] overflow-hidden rounded-[30px] border-2 border-[#C02020] bg-[#3A0000] px-7 py-14 text-center shadow-2xl">
            <canvas
              ref={confettiCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
            <p className="text-5xl tracking-[0.08em] text-white">BINGO!</p>
            <p className="mt-4 text-base text-[#FFBBBB]">
              Completaste todas las casillas.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-white">
              Acercate al staff para reclamar tu premio.
            </p>
            <button
              type="button"
              onClick={() => setIsBingoModalClosed(true)}
              className="mt-7 w-full rounded-xl border border-white/60 bg-white/10 py-3 text-xs text-white hover:bg-white/20"
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

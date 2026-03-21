"use client";

import confetti from "canvas-confetti";
import { useEffect, useMemo, useRef, useState } from "react";

type MainViewProps = {
  playerName: string;
  playerCode: string;
};

type QuestionItem = {
  id: number;
  text: string;
};

const QUESTIONS: QuestionItem[] = [
  { id: 1, text: "Alguna vez deployeaste una app en Vercel?" },
  { id: 2, text: "Tienes mascota?" },
  { id: 3, text: "Usas GitHub todos los dias?" },
  { id: 4, text: "Has trabajado con React o Next.js?" },
  { id: 5, text: "Tomas cafe mientras programas?" },
  { id: 6, text: "Usaste Tailwind CSS en algun proyecto?" },
  { id: 7, text: "Has hecho pair programming?" },
  { id: 8, text: "Aprendiste algo nuevo de IA este mes?" },
  { id: 9, text: "Has participado en un hackathon?" },
  { id: 10, text: "Programaste alguna vez de madrugada?" },
  { id: 11, text: "Tienes proyecto personal en produccion?" },
  { id: 12, text: "Has usado TypeScript?" },
  { id: 13, text: "Te gusta dar charlas o talleres?" },
  { id: 14, text: "Has usado Docker?" },
  { id: 15, text: "Escuchas musica para concentrarte?" },
  { id: 16, text: "Has probado una base de datos NoSQL?" },
  { id: 17, text: "Trabajaste con APIs REST?" },
  { id: 18, text: "Alguna vez rompiste produccion y lo arreglaste?" },
  { id: 19, text: "Has usado Figma para diseñar interfaces?" },
  { id: 20, text: "Te gustaria aprender ciberseguridad este año?" },
];

const MOCK_PARTICIPANT_CODES = [
  "AN12",
  "BE34",
  "CR56",
  "DA78",
  "EL90",
  "FA11",
  "GI22",
  "HA33",
  "IR44",
  "JO55",
  "KA66",
  "LU77",
  "MI88",
  "NO99",
  "PA10",
  "QU20",
  "RA30",
  "SA40",
  "TI50",
  "UL60",
  "VA70",
  "WI80",
  "XI13",
  "YA24",
  "ZE35",
];

const shuffle = <T,>(items: T[]) => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const MainView = ({ playerName, playerCode }: MainViewProps) => {
  const boardQuestions = useMemo(() => shuffle(QUESTIONS).slice(0, 9), []);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(
    null,
  );
  const [codeInput, setCodeInput] = useState("");
  const [validatedByQuestion, setValidatedByQuestion] = useState<
    Record<number, string>
  >({});
  const [usedCodes, setUsedCodes] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState("");
  const [isBingoModalClosed, setIsBingoModalClosed] = useState(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const completedCount = Object.keys(validatedByQuestion).length;
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
        colors: ["#3CE0B8", "#FFFFFF", "#1F73C9"],
      });
      instance({
        particleCount: 90,
        spread: 90,
        startVelocity: 45,
        gravity: 0.9,
        origin: { x: 0.85, y: 0.65 },
        colors: ["#3CE0B8", "#FFFFFF", "#1F73C9"],
      });
    };

    burst();
  }, [isBingo, isBingoModalClosed]);

  const closeQuestionPanel = () => {
    setSelectedQuestionId(null);
    setCodeInput("");
    setErrorMessage("");
  };

  const handleValidateCode = () => {
    if (!selectedQuestion) return;

    const normalizedCode = codeInput.trim().toUpperCase();
    const isFormatValid = /^[A-Z]{2}\d{2}$/.test(normalizedCode);
    const existsInMockData = MOCK_PARTICIPANT_CODES.includes(normalizedCode);

    if (!isFormatValid) {
      setErrorMessage("El codigo debe tener formato AB12.");
      return;
    }
    if (!existsInMockData) {
      setErrorMessage("Codigo no encontrado en el registro mock.");
      return;
    }
    if (normalizedCode === playerCode) {
      setErrorMessage("No puedes usar tu propio codigo.");
      return;
    }
    if (usedCodes.has(normalizedCode)) {
      setErrorMessage("Ese codigo ya fue usado en otra casilla.");
      return;
    }

    setValidatedByQuestion((prev) => ({
      ...prev,
      [selectedQuestion.id]: normalizedCode,
    }));
    setUsedCodes((prev) => new Set(prev).add(normalizedCode));
    closeQuestionPanel();
  };

  return (
    <main className="font-arcade relative flex min-h-screen items-center justify-center bg-[#0B3CB7] px-4 py-6">
      <section className="w-full max-w-[470px] rounded-[34px] px-7 py-10">
        <header className="text-center">
          <div className="flex items-center justify-center gap-3 text-6xl">
            <span className="text-[#3CE0B8]">B</span>
            <span className="rounded-xl bg-[#1F73C9] px-5 py-2 text-white">
              T
            </span>
            <span className="text-[#3CE0B8]">P</span>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-white">
            Hola, <span className="text-[#B7FFEB]">{playerName}</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white">
            Tu codigo: <span className="text-[#3CE0B8]">{playerCode}</span>
          </p>
        </header>

        <div className="mt-8 grid grid-cols-3 gap-4">
          {boardQuestions.map((question) => {
            const isDone = Boolean(validatedByQuestion[question.id]);
            return (
              <button
                key={question.id}
                type="button"
                disabled={isDone}
                onClick={() => {
                  setSelectedQuestionId(question.id);
                  setErrorMessage("");
                }}
                className={`h-20 rounded-xl border-2 text-4xl transition ${
                  isDone
                    ? "cursor-not-allowed border-[#2BCFA5] bg-[#2BCFA5] text-white"
                    : "border-white bg-white text-[#1F73C9] hover:scale-[1.02]"
                }`}
              >
                {question.id}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-white">
          Completadas: {completedCount}/9
        </p>
        {isBingo && isBingoModalClosed && (
          <div className="mt-7 rounded-2xl border-2 border-[#3CE0B8] bg-[#0D3AA8] px-4 py-4 text-center">
            <p className="text-sm text-[#B7FFEB]">Estado: EN ESPERA</p>
            <p className="mt-2 text-xs leading-relaxed text-white">
              Ya completaste tu bingo. Mantente cerca del staff para la validacion
              final y entrega de premio.
            </p>
          </div>
        )}
      </section>

      {selectedQuestion && (
        <section className="absolute inset-0 flex items-center justify-center bg-[#04123B] px-4">
          <div className="w-full max-w-[470px] rounded-[30px] border-2 border-[#4D75D7] bg-[#1247C4] px-7 py-9 shadow-2xl">
            <div className="mx-auto w-fit rounded-2xl bg-[#111319] px-7 py-4 text-6xl text-white">
              {selectedQuestion.id}
            </div>
            <p className="mt-7 text-center text-lg leading-relaxed text-white">
              {selectedQuestion.text}
            </p>

            <div className="mt-7 flex items-center gap-2 rounded-xl border-2 border-[#3CE0B8] bg-white px-3 py-3">
              <input
                type="text"
                value={codeInput}
                onChange={(event) =>
                  setCodeInput(event.target.value.toUpperCase())
                }
                placeholder="Ingresa codigo (AB12)"
                className="w-full bg-transparent text-base uppercase text-[#1F73C9] outline-none placeholder:text-[#6784C4]"
                maxLength={4}
              />
              <button
                type="button"
                onClick={handleValidateCode}
                className="rounded-lg bg-[#33D7AF] px-4 py-2 text-base text-white"
              >
                OK
              </button>
            </div>

            {errorMessage && (
              <p className="mt-4 text-xs leading-relaxed text-[#B7FFEB]">
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
        <section className="absolute inset-0 flex items-center justify-center bg-[#04123B] px-4">
          <div className="relative w-full max-w-[470px] overflow-hidden rounded-[30px] border-2 border-[#5D80DB] bg-[#1247C4] px-7 py-14 text-center shadow-2xl">
            <canvas
              ref={confettiCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
            <p className="text-5xl tracking-[0.08em] text-white">BINGO!</p>
            <p className="mt-4 text-base text-[#B7FFEB]">
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

/**
 * Efectos de sonido 8-bit sintetizados con WebAudio (onda cuadrada).
 * Sin archivos de audio: pesan 0 KB y suenan a consola vieja.
 */

type Note = [freq: number, durationMs: number];

let ctx: AudioContext | null = null;
const MUTE_KEY = "mq:mute";

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

let muted = typeof window !== "undefined" ? readMuted() : false;

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    /* sin almacenamiento: se queda en memoria */
  }
}

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // iOS arranca el audio suspendido hasta el primer toque del usuario.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function play(notes: Note[], { type = "square", volume = 0.06 }: { type?: OscillatorType; volume?: number } = {}) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  let t = ac.currentTime;
  for (const [freq, ms] of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(freq ? volume : 0, t);
    gain.gain.setValueAtTime(0, t + ms / 1000 - 0.005);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + ms / 1000);
    t += ms / 1000;
  }
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no soportado */
  }
}

export const sfx = {
  unlock: () => audio(),
  click: () => play([[880, 30]], { volume: 0.03 }),
  coin: () => {
    play([
      [988, 70],
      [1319, 160],
    ]);
    vibrate(30);
  },
  error: () => {
    play([
      [220, 90],
      [165, 160],
    ]);
    vibrate([40, 40, 40]);
  },
  levelUp: () => {
    play([
      [523, 90],
      [659, 90],
      [784, 90],
      [1047, 90],
      [0, 40],
      [784, 90],
      [1047, 260],
    ]);
    vibrate([60, 40, 120]);
  },
  bingo: () => {
    play([
      [659, 110],
      [659, 110],
      [0, 50],
      [659, 110],
      [0, 50],
      [523, 110],
      [659, 150],
      [784, 300],
    ]);
    vibrate([80, 60, 80, 60, 200]);
  },
  alert: () => {
    play([
      [1175, 80],
      [0, 60],
      [1175, 80],
      [0, 60],
      [1568, 180],
    ]);
    vibrate([100, 50, 100]);
  },
  tick: () => play([[1400, 25]], { volume: 0.025 }),
  /** Cada numero de la cuenta regresiva. */
  count: () => {
    play([[660, 140]], { volume: 0.05 });
    vibrate(40);
  },
  /** Fin de la cuenta: arranca el juego. */
  go: () => {
    play([
      [880, 90],
      [1175, 90],
      [1760, 280],
    ]);
    vibrate([80, 40, 160]);
  },
};

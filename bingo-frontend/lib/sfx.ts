/**
 * Sonidos cortos sintetizados con WebAudio: 0 KB de archivos y suenan suaves.
 * Se pueden silenciar desde Mi cuenta.
 */
type Note = [freq: number, durationMs: number];

let ctx: AudioContext | null = null;
const MUTE_KEY = "bg:mute";

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
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // iOS arranca el audio suspendido hasta el primer toque del usuario.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function play(notes: Note[], volume = 0.05) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  let t = ac.currentTime;
  for (const [freq, ms] of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(freq ? volume : 0, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
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
  tap: () => play([[660, 70]], 0.03),
  ok: () => {
    play([
      [660, 90],
      [990, 180],
    ]);
    vibrate(30);
  },
  error: () => {
    play([
      [300, 120],
      [200, 180],
    ]);
    vibrate([40, 40, 40]);
  },
  bingo: () => {
    play([
      [523, 110],
      [659, 110],
      [784, 110],
      [1047, 320],
    ]);
    vibrate([80, 50, 80, 50, 200]);
  },
  count: () => {
    play([[700, 120]], 0.045);
    vibrate(35);
  },
  go: () => {
    play([
      [880, 100],
      [1320, 260],
    ]);
    vibrate([80, 40, 140]);
  },
};

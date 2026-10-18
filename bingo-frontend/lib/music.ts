/**
 * La musiquita del lobby, sintetizada en el navegador.
 *
 * No hay archivo de audio a proposito: un mp3 serian cientos de kilobytes que
 * cada celular descarga en la puerta del evento, con la WiFi saturada. Esto son
 * tres osciladores y pesa cero.
 *
 * Suena solo en el lobby y se apaga al salir. El navegador no deja arrancar
 * audio sin que la persona toque algo, asi que start() se llama desde el boton
 * o desde el primer toque en la pantalla.
 */

type Nota = number | null;

/** La, en Hz, por nota de la escala temperada. */
const NOTA: Record<string, number> = {
  "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.0, "A4": 440.0, "B4": 493.88,
  "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99, "A5": 880.0,
  "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.0, "A3": 220.0,
};

const n = (s: string) => NOTA[s] ?? 0;

/** Melodia alegre de 16 tiempos, en do mayor. */
const MELODIA: Nota[] = [
  n("C5"), n("E5"), n("G5"), n("E5"), n("F5"), n("E5"), n("D5"), null,
  n("D5"), n("F5"), n("A5"), n("F5"), n("E5"), n("D5"), n("C5"), null,
  n("E5"), n("G5"), n("C5"), n("G5"), n("A4"), n("C5"), n("E5"), null,
  n("D5"), n("E5"), n("F5"), n("E5"), n("D5"), n("C5"), n("D5"), null,
];

const BAJO: Nota[] = [
  n("C3"), null, n("G3"), null, n("F3"), null, n("G3"), null,
  n("D3"), null, n("A3"), null, n("G3"), null, n("C3"), null,
  n("A3"), null, n("E3"), null, n("F3"), null, n("C3"), null,
  n("G3"), null, n("D3"), null, n("G3"), null, n("C3"), null,
];

const PASO_MS = 170;

class Musica {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private timer: number | null = null;
  private paso = 0;
  sonando = false;

  private nota(freq: number, tipo: OscillatorType, dur: number, vol: number) {
    if (!this.ctx || !this.gain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.value = freq;
    const t = this.ctx.currentTime;
    // Ataque corto y caida: sin esto cada nota suena como un chasquido.
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env).connect(this.gain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private tick = () => {
    const i = this.paso % MELODIA.length;
    const melodia = MELODIA[i];
    const bajo = BAJO[i];
    if (melodia) this.nota(melodia, "square", 0.16, 0.16);
    if (bajo) this.nota(bajo, "triangle", 0.3, 0.22);
    // Un golpecito cada cuatro tiempos para marcar el ritmo.
    if (i % 4 === 0) this.nota(70, "square", 0.08, 0.12);
    this.paso += 1;
  };

  start() {
    if (this.sonando) return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = this.ctx ?? new Ctor();
      if (this.ctx.state === "suspended") void this.ctx.resume();
      if (!this.gain) {
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0.5;
        this.gain.connect(this.ctx.destination);
      }
      this.sonando = true;
      this.tick();
      this.timer = window.setInterval(this.tick, PASO_MS);
    } catch {
      // Si el navegador no deja crear audio, el lobby funciona igual.
      this.sonando = false;
    }
  }

  stop() {
    this.sonando = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.suspend();
  }

  toggle() {
    if (this.sonando) this.stop();
    else this.start();
    return this.sonando;
  }
}

export const musica = new Musica();

const CLAVE = "bg.musica";

/** Preferencia guardada en el celular. Por defecto suena. */
export function musicaActiva() {
  try {
    return localStorage.getItem(CLAVE) !== "no";
  } catch {
    return true;
  }
}

export function guardarMusica(activa: boolean) {
  try {
    localStorage.setItem(CLAVE, activa ? "si" : "no");
  } catch {
    /* modo privado: no se guarda y ya */
  }
}

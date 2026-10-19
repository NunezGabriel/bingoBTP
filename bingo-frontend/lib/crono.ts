/**
 * Los pitidos del cronometro, sintetizados igual que la musica del lobby: sin
 * archivo de audio. Aqui pesa menos todavia, porque son cuatro notas.
 *
 * El navegador no deja abrir audio sin un gesto de la persona, asi que el
 * contexto nace al pulsar "Empezar" y no al cargar la pagina. Si el audio
 * falla, el cronometro sigue contando: el numero es lo que importa.
 */
class Pitidos {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;

  /** Abre el audio. Tiene que llamarse desde un clic o no suena nada. */
  despertar() {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = this.ctx ?? new Ctor();
      if (this.ctx.state === "suspended") void this.ctx.resume();
      if (!this.gain) {
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0.6;
        this.gain.connect(this.ctx.destination);
      }
    } catch {
      // Navegador sin audio: no pasa nada, el numero se sigue viendo.
    }
  }

  private nota(freq: number, tipo: OscillatorType, dur: number, vol: number, retraso = 0) {
    if (!this.ctx || !this.gain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.value = freq;
    const t = this.ctx.currentTime + retraso;
    // Ataque corto y caida: sin esto cada nota suena como un chasquido.
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env).connect(this.gain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /**
   * Un pitido por segundo en los ultimos diez. Los tres finales suben de tono
   * y duran mas: es lo que avisa que ya no da tiempo a nada.
   */
  tic(restan: number) {
    this.despertar();
    const ultimos = restan <= 3;
    this.nota(ultimos ? 1174.66 : 880, "square", ultimos ? 0.22 : 0.1, 0.3);
  }

  /** Se acabo: tres golpes agudos y un bajo largo, para que llegue al fondo. */
  fin() {
    this.despertar();
    [1046.5, 1046.5, 1318.51].forEach((f, i) => this.nota(f, "square", 0.13, 0.33, i * 0.15));
    this.nota(196, "triangle", 1.1, 0.4, 0.5);
    this.nota(98, "square", 1.1, 0.25, 0.5);
  }
}

export const pitidos = new Pitidos();

/** Milisegundos a MM:SS. Redondea hacia arriba para que el 0 dure un segundo. */
export function reloj(ms: number) {
  const total = Math.ceil(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

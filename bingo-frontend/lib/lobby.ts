import { me as meApi } from "./api";

/**
 * Conexion al lobby.
 *
 * Va por WebSocket aparte del SSE del juego: aqui el celular tambien habla
 * (manda su posicion). Solo vive mientras la pantalla del lobby esta abierta.
 *
 * El navegador no manda cookies en un WebSocket a otro dominio, asi que primero
 * se pide un ticket de un minuto a la API y se abre la conexion con el.
 */

export type LobbyPlayer = {
  id: number;
  name: string;
  skin: string | null;
  /** Donde se dibuja ahora mismo. */
  x: number;
  y: number;
  /** Donde dijo la ultima foto que estaba. El dibujo va hacia aqui. */
  tx: number;
  ty: number;
  d: number;
  w: boolean;
  emote: boolean;
  emoteAt: number;
};

type Handlers = {
  onReady: (you: LobbyPlayer, world: { w: number; h: number }, cooldown: number) => void;
  onChange: () => void;
  onError: (message: string) => void;
};

export class LobbyClient {
  players = new Map<number, LobbyPlayer>();
  /**
   * Quien es quien: nombre y personaje de cada persona conectada.
   *
   * Hace falta aparte de `players` porque las fotos del lobby solo traen
   * numeros (posicion, direccion), y quien se aleja sale de la foto. Sin esta
   * libreta, al volver a acercarse reaparecia como un desconocido y se
   * dibujaba con el personaje por defecto.
   */
  private libreta = new Map<number, { name: string; skin: string | null }>();
  total = 0;
  meId = 0;
  private ws: WebSocket | null = null;
  private handlers: Handlers;
  private closed = false;
  private retries = 0;
  private lastSent = 0;

  constructor(handlers: Handlers) {
    this.handlers = handlers;
  }

  async connect() {
    this.closed = false;
    let ticket: string;
    try {
      ticket = (await meApi.lobbyTicket()).ticket;
    } catch {
      this.handlers.onError("No se pudo entrar al lobby. Recarga la pagina");
      return;
    }
    if (this.closed) return;

    const base =
      process.env.NEXT_PUBLIC_WS_URL ||
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/lobby`;
    const ws = new WebSocket(`${base}?ticket=${encodeURIComponent(ticket)}`);
    this.ws = ws;

    ws.onmessage = (ev) => this.onMessage(String(ev.data));
    ws.onopen = () => {
      this.retries = 0;
    };
    ws.onclose = (ev) => {
      if (this.closed) return;
      // 4003: cuenta de admin. No tiene sentido reintentar.
      if (ev.code === 4003) return this.handlers.onError("Las cuentas de admin no entran al lobby");
      this.retries += 1;
      if (this.retries > 6) return this.handlers.onError("Se perdio la conexion con el lobby");
      setTimeout(() => this.connect(), Math.min(5000, 400 * this.retries));
    };
  }

  private onMessage(raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.t === "welcome") {
      const you = msg.you as LobbyPlayer;
      this.meId = you.id;
      this.players.clear();
      this.libreta.clear();
      for (const p of msg.players as LobbyPlayer[]) {
        this.libreta.set(p.id, { name: p.name, skin: p.skin });
        this.players.set(p.id, { ...p, tx: p.x, ty: p.y, w: false, emote: false, emoteAt: 0 });
      }
      this.handlers.onReady(
        { ...you, w: false, emote: false, emoteAt: 0 },
        msg.world as { w: number; h: number },
        Number(msg.cooldown ?? 30000),
      );
      return;
    }

    if (msg.t === "join") {
      const p = msg.player as LobbyPlayer;
      // El servidor avisa las entradas a todos, no solo a los que estan cerca:
      // por eso la libreta termina teniendo a todo el mundo.
      this.libreta.set(p.id, { name: p.name, skin: p.skin });
      if (p.id !== this.meId)
        this.players.set(p.id, { ...p, tx: p.x, ty: p.y, w: false, emote: false, emoteAt: 0 });
      this.handlers.onChange();
      return;
    }

    if (msg.t === "leave") {
      const id = Number(msg.id);
      this.players.delete(id);
      this.libreta.delete(id);
      this.handlers.onChange();
      return;
    }

    if (msg.t === "s") {
      const now = Date.now();
      const vistos = new Set<number>();
      for (const row of msg.p as number[][]) {
        const [id, x, y, d, w, emote] = row;
        vistos.add(id);
        if (id === this.meId) continue;
        const prev = this.players.get(id);
        if (prev) {
          // Un salto grande no es alguien corriendo: es que reaparecio o se
          // reconecto. Ahi conviene teletransportarlo y no cruzar la plaza
          // deslizandose durante medio segundo.
          if (Math.abs(x - prev.x) > 240 || Math.abs(y - prev.y) > 240) {
            prev.x = x;
            prev.y = y;
          }
          prev.tx = x;
          prev.ty = y;
          prev.d = d;
          prev.w = w === 1;
          if (emote === 1) prev.emoteAt = now;
        } else {
          // Alguien que se acerco: quien es ya lo sabemos por la libreta.
          const quien = this.libreta.get(id);
          this.players.set(id, {
            id,
            name: quien?.name ?? "",
            skin: quien?.skin ?? null,
            x,
            y,
            tx: x,
            ty: y,
            d,
            w: w === 1,
            emote: false,
            emoteAt: emote === 1 ? now : 0,
          });
        }
      }
      // Los que ya no estan en la zona dejan de dibujarse.
      for (const id of this.players.keys()) {
        if (!vistos.has(id)) this.players.delete(id);
      }
      this.total = Number(msg.n ?? this.players.size + 1);
      this.handlers.onChange();
    }
  }

  /** Manda la posicion, como mucho 10 veces por segundo. */
  /**
   * Acerca a cada quien a su ultima posicion conocida, un poco por cuadro.
   *
   * Las fotos del servidor llegan seis veces por segundo. Dibujadas tal cual
   * vienen, los demas avanzan a tirones mientras el personaje propio, que se
   * mueve en local a 60 cuadros, va suave. Esto rellena los huecos.
   *
   * El factor sale de una exponencial y no de un porcentaje fijo por cuadro
   * para que la suavidad no dependa de cuantos cuadros por segundo de el
   * telefono: con 30 o con 60 tarda lo mismo en llegar.
   */
  suavizar(dt: number) {
    const f = 1 - Math.exp(-dt / 0.08);
    for (const p of this.players.values()) {
      p.x += (p.tx - p.x) * f;
      p.y += (p.ty - p.y) * f;
    }
  }

  move(x: number, y: number, d: number, w: boolean) {
    const now = Date.now();
    if (now - this.lastSent < 100) return;
    this.lastSent = now;
    this.send({ t: "m", x: Math.round(x), y: Math.round(y), d, w });
  }

  emote() {
    this.send({ t: "e" });
  }

  private send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(data));
  }

  close() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}

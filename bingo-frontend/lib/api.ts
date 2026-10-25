import type {
  AdminEventRow,
  AdminPlayer,
  Card,
  EventView,
  HistoryEvent,
  LeaderboardRow,
  MeResponse,
  Mission,
  MissionCard,
  MissionReport,
  Overview,
  Player,
  Round,
  RoundResults,
  SelfPlayer,
  Skin,
  Standing,
} from "./types";

/** Ruta relativa: el navegador llama a /api y Next (o nginx) lo enruta al backend. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      // Cabecera anti-CSRF que exige el backend en toda escritura.
      headers: { "Content-Type": "application/json", "x-bg": "1" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Sin conexion. Revisa tu internet e intenta otra vez");
  }

  const text = await res.text();
  let data: Record<string, unknown> | null = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) ||
      (res.status >= 500 ? "El servidor tuvo un problema. Intenta de nuevo" : `Error ${res.status}`);
    throw new ApiError(res.status, message);
  }
  return data as T;
}

const get = <T>(p: string) => request<T>("GET", p);
const post = <T>(p: string, b: unknown = {}) => request<T>("POST", p, b);
const del = <T>(p: string) => request<T>("DELETE", p);

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Algo salio mal";
}

/** Lo que escribe la gente: "ab-12 cd" -> "AB12CD". */
export function cleanCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/* ---------- Jugador ---------- */

export const auth = {
  /** Una sola puerta: si el usuario no existe, se crea con esa clave. */
  entrar: (usuario: string, clave: string) =>
    post<{ player: SelfPlayer; nuevo: boolean }>("/auth/entrar", { usuario, clave }),
  logout: () => post<{ ok: true }>("/auth/salir"),
};

export const me = {
  get: () => get<MeResponse>("/me"),
  history: () => get<{ events: HistoryEvent[] }>("/me/history"),
  clave: (actual: string, nueva: string) => post<{ ok: true }>("/me/clave", { actual, nueva }),
  skins: () => get<{ skins: Skin[]; skin: string | null }>("/me/skins"),
  setSkin: (skin: string) => post<{ player: SelfPlayer }>("/me/skin", { skin }),
  lobbyTicket: () => post<{ ticket: string }>("/me/lobby-ticket"),
  misiones: () => get<MissionCard>("/me/misiones"),
};

export const game = {
  current: () => get<{ round: Round | null; card: Card | null; winners: RoundResults["winners"] }>("/game/current"),
  /** Entrar a la ronda con el codigo que el organizador proyecta en la sala. */
  entrar: (codigo: string) => post<{ round: Round; card: Card }>("/game/entrar", { codigo }),
  sign: (position: number, code: string) =>
    post<{ signedCount: number; completedRank: number | null; card: Card }>("/game/sign", { position, code }),
};

export type ScreenData = {
  event: EventView | null;
  top: LeaderboardRow[];
  players: number;
  round: Round | null;
  progress: RoundResults | null;
};

export const publicApi = {
  event: () => get<{ event: EventView | null; players: number }>("/public/event"),
  leaderboard: (limit = 50) =>
    get<{ event: EventView | null; top: LeaderboardRow[]; me: Standing | null }>(`/public/leaderboard?limit=${limit}`),
  screen: () => get<ScreenData>("/public/screen"),
};

/* ---------- Admin (su cuenta tiene rol ADMIN) ---------- */

export const admin = {
  overview: () => get<Overview>("/admin/overview"),

  events: () => get<{ events: AdminEventRow[] }>("/admin/events"),
  createEvent: (name: string) => post<{ event: EventView }>("/admin/events", { name }),
  openEvent: (id: number) => post<{ event: EventView }>(`/admin/events/${id}/open`),
  closeEvent: (id: number) => post<{ ok: true; ranked: number }>(`/admin/events/${id}/close`),
  deleteEvent: (id: number) => del<{ ok: true }>(`/admin/events/${id}`),

  newRound: (points?: { cellPoints?: number; completePoints?: number }) =>
    post<{ round: Round & { code: string } }>("/admin/rounds", points ?? {}),
  endRound: (id: number) => post<{ round: Round; results: RoundResults }>(`/admin/rounds/${id}/end`),

  players: (params: { q?: string; onlyEvent?: boolean; page?: number }) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.onlyEvent) search.set("scope", "event");
    if (params.page) search.set("page", String(params.page));
    return get<{ total: number; page: number; hasMore: boolean; players: AdminPlayer[] }>(`/admin/players?${search}`);
  },
  adjustPoints: (id: number, amount: number, reason: string) =>
    post<{ ok: true; points: number | null }>(`/admin/players/${id}/points`, { amount, reason }),
  resetClave: (id: number, clave: string) => post<{ ok: true }>(`/admin/players/${id}/clave`, { clave }),
  deletePlayer: (id: number) => del<{ ok: true; name: string }>(`/admin/players/${id}`),
  deleteAllPlayers: () => del<{ ok: true; deleted: number }>("/admin/players"),

  missions: () => get<{ missions: Omit<Mission, "done" | "doneAt">[] }>("/admin/missions"),
  validateMission: (code: string, missionId: string) =>
    post<{ player: Player; mission: string; card: MissionCard }>("/admin/missions/validate", {
      code,
      missionId,
    }),
  missionReport: () => get<MissionReport>("/admin/missions/report"),
};

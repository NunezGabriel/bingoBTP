import type {
  BingoBoard,
  BingoResults,
  Contact,
  EventView,
  GameSession,
  HistoryEvent,
  HouseCount,
  HouseRow,
  LeaderboardRow,
  MeResponse,
  PublicPlayer,
  Role,
  SelfPlayer,
  StaffMission,
  Standing,
} from "./types";
import type { ClassKey, HouseKey } from "./sprites";

/** Ruta relativa: el navegador llama a /api y Next (o nginx) lo enruta al backend. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown> | null;
  constructor(status: number, message: string, data: Record<string, unknown> | null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        // Cabecera anti-CSRF que exige el backend en toda escritura.
        "x-mq": "1",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Sin conexion. Revisa tu internet e intenta otra vez", null);
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
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

const get = <T>(p: string) => request<T>("GET", p);
const post = <T>(p: string, b: unknown = {}) => request<T>("POST", p, b);
const patch = <T>(p: string, b: unknown = {}) => request<T>("PATCH", p, b);
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
  nickname: (n: string) =>
    get<{ available: boolean; reason: string | null }>(`/auth/nickname/${encodeURIComponent(n)}`),
  register: (data: { nickname: string; pin: string; avatarClass: ClassKey; avatarHouse: HouseKey }) =>
    post<{ player: SelfPlayer }>("/auth/register", data),
  login: (nickname: string, pin: string) => post<{ player: SelfPlayer }>("/auth/login", { nickname, pin }),
  logout: () => post<{ ok: true }>("/auth/logout"),
};

export const me = {
  get: () => get<MeResponse>("/me"),
  history: () => get<{ events: HistoryEvent[] }>("/me/history"),
  contacts: () => get<{ contacts: Contact[] }>("/me/contacts"),
  addContact: (code: string) => post<{ isNew: boolean; player: PublicPlayer }>("/me/contacts", { code }),
  avatar: (data: { avatarClass?: ClassKey; avatarHouse?: HouseKey }) =>
    patch<{ player: SelfPlayer }>("/me/avatar", data),
  pin: (currentPin: string, newPin: string) => post<{ ok: true }>("/me/pin", { currentPin, newPin }),
};

export const game = {
  current: () =>
    get<{ game: GameSession | null; board: BingoBoard | null; winners: BingoResults["winners"] }>(
      "/game/current",
    ),
  signBingo: (position: number, code: string) =>
    post<{ signedCount: number; completedRank: number | null; board: BingoBoard }>("/game/bingo/sign", {
      position,
      code,
    }),
};

export type ScreenData = {
  event: EventView | null;
  top: LeaderboardRow[];
  houses: HouseRow[];
  players: number;
  game: GameSession | null;
  bingo: BingoResults | null;
};

export const publicApi = {
  event: () => get<{ event: EventView | null; players: number; houses: HouseCount[] }>("/public/event"),
  leaderboard: (limit = 50) =>
    get<{ event: EventView | null; top: LeaderboardRow[]; houses: HouseRow[]; me: Standing | null }>(
      `/public/leaderboard?limit=${limit}`,
    ),
  screen: () => get<ScreenData>("/public/screen"),
};

/* ---------- Staff ---------- */

export type StaffCard = {
  player: PublicPlayer;
  role: Role;
  points: number;
  missions: StaffMission[];
};

export const staff = {
  player: (code: string) => get<StaffCard>(`/staff/player/${encodeURIComponent(code)}`),
  award: (code: string, mission: string) =>
    post<{ ok: true; mission: { key: string; title: string; points: number }; points: number }>("/staff/award", {
      code,
      mission,
    }),
};

/* ---------- Admin ---------- */

export type AdminEventRow = EventView & { createdAt: string; players: number };

export type LiveEvent = EventView & { players: number; houses: HouseCount[]; connected: number };

export type AdminUser = PublicPlayer & {
  code: string;
  role: Role;
  xp: number;
  createdAt: string;
  inEvent: boolean;
  eventPoints: number | null;
};

export type RunningGame = GameSession & { progress: BingoResults };

export const admin = {
  events: () => get<{ events: AdminEventRow[]; live: LiveEvent | null }>("/admin/events"),
  createEvent: (name: string) => post<{ event: EventView }>("/admin/events", { name }),
  openEvent: (id: number) => post<{ event: EventView }>(`/admin/events/${id}/open`),
  closeEvent: (id: number) => post<{ ok: true; ranked: number }>(`/admin/events/${id}/close`),
  deleteEvent: (id: number) => del<{ ok: true }>(`/admin/events/${id}`),

  game: () =>
    get<{
      event: { id: number; name: string } | null;
      running: RunningGame | null;
      last: { session: GameSession; results: BingoResults } | null;
    }>("/admin/game"),
  startBingo: () => post<{ session: GameSession; boards: number }>("/admin/game/bingo/start"),
  endGame: (id: number) => post<{ session: GameSession; results: BingoResults }>(`/admin/game/${id}/end`),

  users: (params: { q?: string; onlyEvent?: boolean; page?: number }) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.onlyEvent) search.set("scope", "event");
    if (params.page) search.set("page", String(params.page));
    return get<{ total: number; page: number; hasMore: boolean; users: AdminUser[] }>(`/admin/users?${search}`);
  },
  resetPin: (id: number, pin: string) => post<{ ok: true }>(`/admin/users/${id}/pin`, { pin }),
  setRole: (id: number, role: "PLAYER" | "STAFF") => post<{ ok: true; role: Role }>(`/admin/users/${id}/role`, { role }),
  deleteUser: (id: number) => del<{ ok: true; nickname: string }>(`/admin/users/${id}`),
};

export type Player = { id: number; name: string; skin?: string | null };

export type Role = "PLAYER" | "ADMIN";

export type SelfPlayer = {
  id: number;
  name: string;
  /** Codigo de 6 caracteres: se dicta para que te firmen y es lo que lleva tu QR. */
  code: string;
  role: Role;
  skin: string | null;
  createdAt: string;
};

export type EventStatus = "DRAFT" | "LIVE" | "CLOSED";

export type EventView = {
  id: number;
  name: string;
  status: EventStatus;
  startedAt: string | null;
  closedAt: string | null;
};

export type Standing = { total: number; points: number; rank: number | null };

export type RoundStatus = "COUNTDOWN" | "ACTIVE" | "ENDED";

export type Round = {
  id: number;
  number: number;
  status: RoundStatus;
  startsAt: string;
  endedAt: string | null;
  cellPoints: number;
  completePoints: number;
  podiumBonus: number[];
  /** Hora del servidor: corrige relojes de celulares desfasados. */
  serverNow: number;
};

export type MeResponse = {
  player: SelfPlayer;
  event: EventView | null;
  standing: Standing | null;
  round: Round | null;
  /** Como va su tarjeta de misiones, para el aviso del lobby. */
  card: { done: number; total: number } | null;
};

export type Mission = {
  id: string;
  title: string;
  detail: string;
  hint: string;
  icon: string;
  points: number;
  done: boolean;
  doneAt: string | null;
};

export type MissionCard = {
  missions: Mission[];
  done: number;
  total: number;
  bonus: number;
  completa: boolean;
  code: string;
  event: EventView | null;
};

export type Skin = { id: string; name: string; detail: string };

export type Cell = {
  position: number;
  text: string;
  signedAt: string | null;
  signedBy: Player | null;
};

export type Card = {
  id: number;
  roundId: number;
  completedAt: string | null;
  completedRank: number | null;
  signed: number;
  size: number;
  cells: Cell[];
};

export type RoundResults = {
  cards: number;
  completed: number;
  winners: { rank: number; player: Player }[];
  closest: { signed: number; player: Player }[];
};

export type LeaderboardRow = { rank: number; points: number; player: Player };

export type HistoryEvent = {
  id: number;
  name: string;
  status: EventStatus;
  points: number;
  finalRank: number | null;
  joinedAt: string;
  closedAt: string | null;
};

export type PointsEvent = { amount: number; label: string; points: number };

/* ---------- Admin ---------- */

export type AdminEventRow = EventView & { createdAt: string; players: number; rounds: number };

export type AdminPlayer = {
  id: number;
  name: string;
  code: string;
  role: Role;
  skin: string | null;
  createdAt: string;
  inEvent: boolean;
  points: number | null;
};

export type Overview = {
  event: EventView | null;
  players: number;
  connected: number;
  /** Cuantos estan ahora mismo en el lobby. */
  lobby: number;
  top?: LeaderboardRow[];
  round?: (Round & { progress: RoundResults }) | null;
  lastRound?: { round: Round; results: RoundResults } | null;
  missions?: { completas: number; porMision: { id: string; title: string; count: number }[]; total: number };
};

export type MissionReport = {
  completas: { player: Player; done: string[]; lastAt: string }[];
  people: { player: Player; done: string[]; lastAt: string }[];
  porMision: { id: string; title: string; count: number }[];
  total: number;
};

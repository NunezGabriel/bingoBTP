export type Player = { id: number; name: string };

export type SelfPlayer = {
  id: number;
  name: string;
  /** Codigo de 6 caracteres que se dicta para que te firmen. */
  code: string;
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
};

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
  createdAt: string;
  inEvent: boolean;
  points: number | null;
};

export type Overview = {
  event: EventView | null;
  players: number;
  connected: number;
  top?: LeaderboardRow[];
  round?: (Round & { progress: RoundResults }) | null;
  lastRound?: { round: Round; results: RoundResults } | null;
};

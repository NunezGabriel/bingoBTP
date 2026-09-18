import type { ClassKey, HouseKey } from "./sprites";
import type { TierKey } from "./progression";

export type Role = "PLAYER" | "STAFF" | "ADMIN";

export type PublicPlayer = {
  id: number;
  nickname: string;
  avatarClass: ClassKey;
  avatarHouse: HouseKey;
  level: number;
  tier: TierKey;
  title: string;
};

export type Progress = {
  xp: number;
  level: number;
  levelXp: number;
  nextLevelXp: number | null;
  tier: TierKey;
  tierName: string;
  title: string;
};

export type SelfPlayer = PublicPlayer & {
  code: string;
  role: Role;
  progress: Progress;
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

export type GameStatus = "COUNTDOWN" | "ACTIVE" | "ENDED";

/** Un juego lanzado por el admin. Por ahora solo BINGO. */
export type GameSession = {
  id: number;
  type: "BINGO";
  status: GameStatus;
  startsAt: string;
  endedAt: string | null;
  cellPoints: number;
  completePoints: number;
  podiumBonus: number[];
  /** Hora del servidor al generar la respuesta: corrige relojes de celulares desfasados. */
  serverNow: number;
};

export type MeResponse = {
  player: SelfPlayer;
  event: EventView | null;
  standing: Standing | null;
  game: GameSession | null;
};

export type BingoCell = {
  position: number;
  text: string;
  signedAt: string | null;
  signedBy: PublicPlayer | null;
};

export type BingoBoard = {
  id: number;
  sessionId: number;
  completedAt: string | null;
  completedRank: number | null;
  signed: number;
  size: number;
  cellPoints: number;
  completePoints: number;
  podiumBonus: number[];
  cells: BingoCell[];
};

export type BingoResults = {
  boards: number;
  completed: number;
  winners: { rank: number; player: PublicPlayer }[];
  closest: { signed: number; player: PublicPlayer }[];
};

export type Contact = {
  player: PublicPlayer;
  eventName: string | null;
  since: string;
};

export type LeaderboardRow = { rank: number; points: number; player: PublicPlayer };
export type HouseRow = { house: HouseKey; points: number; players: number };
export type HouseCount = { house: HouseKey; players: number };

export type PointsEvent = {
  amount: number;
  label: string;
  source: string;
  points: number;
  xp: number;
  level: number;
};

export type TrophyKind = "CHAMPION" | "PODIUM" | "TOP10" | "PARTICIPANT";

export type HistoryEvent = {
  id: number;
  name: string;
  status: EventStatus;
  points: number;
  finalRank: number | null;
  joinedAt: string;
  closedAt: string | null;
  trophy: { kind: TrophyKind; rank: number | null } | null;
};

/** Mision de src/content/missions.js vista por el staff para un jugador. */
export type StaffMission = {
  key: string;
  title: string;
  points: number;
  repeatable: boolean;
  timesAwarded: number;
};

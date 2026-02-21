import { API_BASE_URL, LEADERBOARD_ENABLED } from "../config/leaderboard";

export type MiniGameKey = "ice_hockey" | "seattle_traffic" | "farmers_market" | "northgate";

export interface LeaderboardSubmissionPayload {
  client_id: string;
  player_name: string;
  mini_game: MiniGameKey;
  duration_ms?: number;
  deaths?: number;
}

export interface LeaderboardEntry extends LeaderboardSubmissionPayload {
  id: string;
  created_at: string;
}

const STORAGE_KEYS = {
  clientId: "leaderboard.client_id",
  playerName: "leaderboard.player_name",
} as const;

const MINI_GAME_PREFIX = "leaderboard.mini_game";
const MINI_GAME_KEYS = {
  startMs: "start_ms",
  deaths: "deaths",
} as const;

const SEATTLE_START_TIME_MINUTES = 7 * 60 + 15;

function miniGameStorageKey(miniGame: MiniGameKey, key: keyof typeof MINI_GAME_KEYS): string {
  return `${MINI_GAME_PREFIX}.${miniGame}.${MINI_GAME_KEYS[key]}`;
}

function requestTimeoutMs<T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Leaderboard request timed out"));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function generateClientId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cid_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
}

export function getClientId(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.clientId);
  if (existing) return existing;
  const generated = generateClientId();
  localStorage.setItem(STORAGE_KEYS.clientId, generated);
  return generated;
}

export function getPlayerName(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.playerName);
  return existing ?? "";
}

export function setPlayerName(name: string): void {
  localStorage.setItem(STORAGE_KEYS.playerName, name);
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  if (!LEADERBOARD_ENABLED) return [];
  const clampedLimit = Math.max(1, Math.min(20, Math.floor(limit)));
  const response = await requestTimeoutMs(
    fetch(`${API_BASE_URL}/leaderboard?limit=${clampedLimit}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
  );

  if (!response.ok) {
    throw new Error(`Leaderboard fetch failed (${response.status})`);
  }

  const data = (await response.json()) as { entries?: unknown[] };
  if (!Array.isArray(data.entries)) return [];

  const entries: LeaderboardEntry[] = [];

  for (const entry of data.entries) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.client_id !== "string" || typeof row.created_at !== "string") continue;
    if (typeof row.player_name !== "string" || typeof row.mini_game !== "string") continue;

    entries.push({
      id: row.id,
      client_id: row.client_id,
      player_name: row.player_name,
      mini_game: row.mini_game as MiniGameKey,
      duration_ms: Number.isFinite(Number(row.duration_ms)) ? Math.floor(Number(row.duration_ms)) : undefined,
      deaths: Number.isFinite(Number(row.deaths)) ? Math.floor(Number(row.deaths)) : undefined,
      created_at: row.created_at,
    });
  }

  return entries;
}

export function formatRunDuration(runDurationMs: number): string {
  const safeMs = Math.max(0, Math.floor(runDurationMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function startMiniGameSession(miniGame: MiniGameKey): void {
  if (!LEADERBOARD_ENABLED) return;
  const startKey = miniGameStorageKey(miniGame, "startMs");
  if (!localStorage.getItem(startKey)) {
    localStorage.setItem(startKey, String(Date.now()));
  }
  const deathsKey = miniGameStorageKey(miniGame, "deaths");
  if (!localStorage.getItem(deathsKey)) {
    localStorage.setItem(deathsKey, "0");
  }
}

export function recordMiniGameDeath(miniGame: MiniGameKey): number {
  const deathsKey = miniGameStorageKey(miniGame, "deaths");
  const current = Number(localStorage.getItem(deathsKey) ?? "0");
  const next = Number.isFinite(current) ? Math.max(0, Math.floor(current)) + 1 : 1;
  localStorage.setItem(deathsKey, String(next));
  localStorage.removeItem(miniGameStorageKey(miniGame, "startMs"));
  return next;
}

export function resetMiniGameTimer(miniGame: MiniGameKey): void {
  const startKey = miniGameStorageKey(miniGame, "startMs");
  localStorage.setItem(startKey, String(Date.now()));
}

function readMiniGameSession(miniGame: MiniGameKey): { startMs?: number; deaths?: number } {
  const startMsRaw = localStorage.getItem(miniGameStorageKey(miniGame, "startMs"));
  const deathsRaw = localStorage.getItem(miniGameStorageKey(miniGame, "deaths"));
  const startMs = startMsRaw ? Number(startMsRaw) : undefined;
  const deaths = deathsRaw ? Number(deathsRaw) : undefined;
  return {
    startMs: Number.isFinite(startMs) ? startMs : undefined,
    deaths: Number.isFinite(deaths) ? Math.max(0, Math.floor(deaths)) : undefined,
  };
}

function clearMiniGameSession(miniGame: MiniGameKey): void {
  localStorage.removeItem(miniGameStorageKey(miniGame, "startMs"));
  localStorage.removeItem(miniGameStorageKey(miniGame, "deaths"));
}

export async function submitMiniGameResult(
  miniGame: MiniGameKey,
  extra: { duration_ms?: number; deaths?: number } = {}
): Promise<boolean> {
  if (!LEADERBOARD_ENABLED) return false;
  const playerName = getPlayerName().trim();
  if (!playerName) return false;

  const session = readMiniGameSession(miniGame);
  const now = Date.now();
  const computedDuration = session.startMs ? Math.max(1, Math.floor(now - session.startMs)) : undefined;

  const payload: LeaderboardSubmissionPayload = {
    client_id: getClientId(),
    player_name: playerName,
    mini_game: miniGame,
    duration_ms: extra.duration_ms ?? computedDuration,
    deaths: extra.deaths ?? session.deaths,
  };

  try {
    const response = await requestTimeoutMs(
      fetch(`${API_BASE_URL}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
    clearMiniGameSession(miniGame);
    return response.ok;
  } catch {
    return false;
  }
}

export function formatArrivalTimeMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) return "-:--";
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const hours24 = Math.floor(minutes / 60) % 24;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mins = minutes % 60;
  return `${hours12}:${String(mins).padStart(2, "0")}`;
}

export function formatSeattleArrivalFromDurationMs(durationMs: number): string {
  const safeMs = Math.max(0, Math.floor(durationMs));
  const minutesAfterStart = Math.floor(safeMs / 60000);
  return formatArrivalTimeMinutes(SEATTLE_START_TIME_MINUTES + minutesAfterStart);
}

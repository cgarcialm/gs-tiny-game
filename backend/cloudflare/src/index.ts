interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT_WINDOW_SECONDS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  RATE_LIMIT_MAX_REQUESTS_READ?: string;
}

interface SubmitPayload {
  client_id: string;
  player_name: string;
  mini_game: string;
  duration_ms?: number;
  deaths?: number;
}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

const LEADERBOARD_LIMIT_MIN = 1;
const LEADERBOARD_LIMIT_MAX = 50;
const ALLOWED_MINI_GAMES = new Set(["ice_hockey", "seattle_traffic", "farmers_market", "northgate", "full_run"]);

function sanitizeOrigins(rawAllowedOrigins: string | undefined): Set<string> {
  const defaults = ["http://localhost:5173", "http://127.0.0.1:5173"];
  const configured = (rawAllowedOrigins ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return new Set([...defaults, ...configured]);
}

function buildCorsHeaders(request: Request, env: Env): Record<string, string> {
  const requestOrigin = request.headers.get("Origin");
  const allowedOrigins = sanitizeOrigins(env.ALLOWED_ORIGINS);
  const allowAny = allowedOrigins.has("*");
  const allowOrigin =
    requestOrigin && (allowAny || allowedOrigins.has(requestOrigin)) ? requestOrigin : "";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };

  if (allowAny) {
    headers["Access-Control-Allow-Origin"] = "*";
  } else if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }

  return headers;
}

function getClientIp(request: Request): string {
  const candidate =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For") ??
    request.headers.get("X-Real-IP") ??
    "";
  return candidate.split(",")[0].trim() || "unknown";
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseWindowSeconds(env: Env): number {
  const parsed = Number(env.RATE_LIMIT_WINDOW_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 60;
}

function parseMaxRequests(env: Env, routeKey: string): number {
  const raw =
    routeKey === "leaderboard"
      ? env.RATE_LIMIT_MAX_REQUESTS_READ ?? env.RATE_LIMIT_MAX_REQUESTS
      : env.RATE_LIMIT_MAX_REQUESTS;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed === 0) return 0;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 20;
}

async function enforceRateLimit(request: Request, env: Env, routeKey: string): Promise<boolean> {
  const windowSeconds = parseWindowSeconds(env);
  const maxRequests = parseMaxRequests(env, routeKey);
  if (maxRequests === 0) {
    return true;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(nowSeconds / windowSeconds);
  const ipHash = await sha256Hex(getClientIp(request));
  const key = `${routeKey}:${ipHash}:${bucket}`;
  const expiresAt = (bucket + 1) * windowSeconds;

  await env.DB.prepare("DELETE FROM rate_limits WHERE expires_at < ?")
    .bind(nowSeconds)
    .run();

  const current = await env.DB.prepare("SELECT count FROM rate_limits WHERE key = ?")
    .bind(key)
    .first<{ count: number }>();

  if (!current) {
    await env.DB.prepare("INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?)")
      .bind(key, expiresAt)
      .run();
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  await env.DB.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?")
    .bind(key)
    .run();
  return true;
}

function validateSubmission(payload: SubmitPayload): string[] {
  const errors: string[] = [];

  if (typeof payload.client_id !== "string" || payload.client_id.length < 8 || payload.client_id.length > 64) {
    errors.push("client_id must be a string between 8 and 64 chars");
  }

  if (typeof payload.player_name !== "string") {
    errors.push("player_name must be a string");
  } else {
    const trimmed = payload.player_name.trim();
    if (trimmed.length < 3 || trimmed.length > 16) {
      errors.push("player_name must be 3-16 chars");
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
      errors.push("player_name contains invalid characters");
    }
  }

  if (typeof payload.mini_game !== "string" || !ALLOWED_MINI_GAMES.has(payload.mini_game)) {
    errors.push("mini_game must be a supported value");
  }

  return errors;
}

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...corsHeaders,
    },
  });
}

async function handleSubmit(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const allowed = await enforceRateLimit(request, env, "submit");
  if (!allowed) {
    return jsonResponse({ ok: false, error: "rate_limited" }, 429, corsHeaders);
  }

  let payload: SubmitPayload;
  try {
    payload = (await request.json()) as SubmitPayload;
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400, corsHeaders);
  }

  const validationErrors = validateSubmission(payload);
  if (validationErrors.length > 0) {
    return jsonResponse(
      { ok: false, error: "invalid_payload", details: validationErrors },
      400,
      corsHeaders
    );
  }

  const entryId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO leaderboard_entries (
      id,
      client_id,
      player_name,
      mini_game,
      duration_ms,
      deaths
    ) VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      entryId,
      payload.client_id,
      payload.player_name.trim(),
      payload.mini_game,
      payload.duration_ms ?? null,
      payload.deaths ?? null
    )
    .run();

  return jsonResponse({ ok: true, id: entryId }, 200, corsHeaders);
}

async function handleLeaderboard(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const allowed = await enforceRateLimit(request, env, "leaderboard");
  if (!allowed) {
    return jsonResponse({ ok: false, error: "rate_limited" }, 429, corsHeaders);
  }

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit"));
  const requestedMiniGame = url.searchParams.get("mini_game");
  const safeLimit = Number.isFinite(requestedLimit)
    ? Math.min(LEADERBOARD_LIMIT_MAX, Math.max(LEADERBOARD_LIMIT_MIN, Math.floor(requestedLimit)))
    : 10;

  if (requestedMiniGame && ALLOWED_MINI_GAMES.has(requestedMiniGame)) {
    const orderBy = "duration_ms ASC, deaths ASC, created_at ASC";
    const rows = await env.DB.prepare(
      `SELECT
        id,
        client_id,
        player_name,
        mini_game,
        duration_ms,
        deaths,
        created_at
      FROM leaderboard_entries
      WHERE mini_game = ?
      ORDER BY ${orderBy}
      LIMIT ?`
    )
      .bind(requestedMiniGame, safeLimit)
      .all();
    return jsonResponse({ ok: true, entries: rows.results ?? [] }, 200, corsHeaders);
  }

  const rows = await env.DB.prepare(
    `SELECT
      id,
      client_id,
      player_name,
      mini_game,
      duration_ms,
      deaths,
      created_at
    FROM leaderboard_entries
    ORDER BY created_at DESC
    LIMIT ?`
  )
    .bind(safeLimit)
    .all();

  return jsonResponse({ ok: true, entries: rows.results ?? [] }, 200, corsHeaders);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/submit" && request.method === "POST") {
      return handleSubmit(request, env, corsHeaders);
    }
    if (url.pathname === "/leaderboard" && request.method === "GET") {
      return handleLeaderboard(request, env, corsHeaders);
    }

    return jsonResponse({ ok: false, error: "not_found" }, 404, corsHeaders);
  },
};

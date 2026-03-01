CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  mini_game TEXT NOT NULL,
  run_id TEXT,
  duration_ms INTEGER,
  deaths INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_game_score
  ON leaderboard_entries (
    mini_game,
    duration_ms ASC,
    deaths ASC,
    created_at ASC
  );

CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at
  ON leaderboard_entries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_run_id
  ON leaderboard_entries (run_id, created_at ASC);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

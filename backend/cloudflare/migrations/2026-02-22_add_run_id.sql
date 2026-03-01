-- One-time migration for existing D1 databases.
-- Adds a run identifier so all mini-game rows and full_run rows can be linked to the same playthrough.

ALTER TABLE leaderboard_entries ADD COLUMN run_id TEXT;

CREATE INDEX IF NOT EXISTS idx_leaderboard_run_id
  ON leaderboard_entries (run_id, created_at ASC);

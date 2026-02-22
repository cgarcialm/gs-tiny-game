-- Mini-game rows associated with GeeSpot's latest full_run (approx. same session window).
WITH latest_full_run AS (
  SELECT id, player_name, created_at
  FROM leaderboard_entries
  WHERE player_name = 'GeeSpot'
    AND mini_game = 'full_run'
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT
  m.id,
  m.player_name,
  m.mini_game,
  m.duration_ms,
  m.deaths,
  m.created_at
FROM leaderboard_entries m
JOIN latest_full_run fr
  ON m.player_name = fr.player_name
WHERE m.mini_game IN ('northgate', 'ice_hockey', 'seattle_traffic', 'farmers_market', 'full_run')
  AND m.created_at <= fr.created_at
  AND m.created_at >= datetime(fr.created_at, '-45 minutes')
ORDER BY m.created_at DESC;

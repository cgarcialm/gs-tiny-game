-- Recent rows for GeeSpot (all mini games + full_run), newest first.
SELECT
  id,
  player_name,
  mini_game,
  duration_ms,
  deaths,
  created_at
FROM leaderboard_entries
WHERE player_name = 'GeeSpot'
ORDER BY created_at DESC
LIMIT 50;


-- For each GeeSpot full_run row, show the inferred mini-game deaths from the same session.
-- "Session" here is approximated as the latest row per mini game within 45 minutes before the full_run row.
SELECT
  fr.id AS full_run_id,
  fr.created_at AS full_run_created_at,
  fr.duration_ms AS full_run_duration_ms,
  COALESCE(fr.deaths, 0) AS full_run_recorded_deaths,

  COALESCE((
    SELECT m.deaths
    FROM leaderboard_entries m
    WHERE m.player_name = fr.player_name
      AND m.mini_game = 'northgate'
      AND m.created_at <= fr.created_at
      AND m.created_at >= datetime(fr.created_at, '-45 minutes')
    ORDER BY m.created_at DESC
    LIMIT 1
  ), 0) AS northgate_deaths,

  COALESCE((
    SELECT m.deaths
    FROM leaderboard_entries m
    WHERE m.player_name = fr.player_name
      AND m.mini_game = 'ice_hockey'
      AND m.created_at <= fr.created_at
      AND m.created_at >= datetime(fr.created_at, '-45 minutes')
    ORDER BY m.created_at DESC
    LIMIT 1
  ), 0) AS ice_hockey_deaths,

  COALESCE((
    SELECT m.deaths
    FROM leaderboard_entries m
    WHERE m.player_name = fr.player_name
      AND m.mini_game = 'seattle_traffic'
      AND m.created_at <= fr.created_at
      AND m.created_at >= datetime(fr.created_at, '-45 minutes')
    ORDER BY m.created_at DESC
    LIMIT 1
  ), 0) AS seattle_traffic_deaths,

  COALESCE((
    SELECT m.deaths
    FROM leaderboard_entries m
    WHERE m.player_name = fr.player_name
      AND m.mini_game = 'farmers_market'
      AND m.created_at <= fr.created_at
      AND m.created_at >= datetime(fr.created_at, '-45 minutes')
    ORDER BY m.created_at DESC
    LIMIT 1
  ), 0) AS farmers_market_deaths,

  (
    COALESCE((
      SELECT m.deaths
      FROM leaderboard_entries m
      WHERE m.player_name = fr.player_name
        AND m.mini_game = 'northgate'
        AND m.created_at <= fr.created_at
        AND m.created_at >= datetime(fr.created_at, '-45 minutes')
      ORDER BY m.created_at DESC
      LIMIT 1
    ), 0)
    + COALESCE((
      SELECT m.deaths
      FROM leaderboard_entries m
      WHERE m.player_name = fr.player_name
        AND m.mini_game = 'ice_hockey'
        AND m.created_at <= fr.created_at
        AND m.created_at >= datetime(fr.created_at, '-45 minutes')
      ORDER BY m.created_at DESC
      LIMIT 1
    ), 0)
    + COALESCE((
      SELECT m.deaths
      FROM leaderboard_entries m
      WHERE m.player_name = fr.player_name
        AND m.mini_game = 'seattle_traffic'
        AND m.created_at <= fr.created_at
        AND m.created_at >= datetime(fr.created_at, '-45 minutes')
      ORDER BY m.created_at DESC
      LIMIT 1
    ), 0)
    + COALESCE((
      SELECT m.deaths
      FROM leaderboard_entries m
      WHERE m.player_name = fr.player_name
        AND m.mini_game = 'farmers_market'
        AND m.created_at <= fr.created_at
        AND m.created_at >= datetime(fr.created_at, '-45 minutes')
      ORDER BY m.created_at DESC
      LIMIT 1
    ), 0)
  ) AS inferred_session_total_deaths
FROM leaderboard_entries fr
WHERE fr.player_name = 'GeeSpot'
  AND fr.mini_game = 'full_run'
ORDER BY fr.created_at DESC;


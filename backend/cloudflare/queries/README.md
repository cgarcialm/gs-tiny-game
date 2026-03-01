# D1 Query Scripts

SQL helpers for inspecting leaderboard data directly in D1.

Run from `backend/cloudflare`:

```bash
npx wrangler d1 execute gs_tiny_game_leaderboard --local --file=./queries/geespot_full_run_session_deaths.sql
```

Use `--remote` instead of `--local` for production.

Notes:
- These scripts infer a "session" by looking at the mini-game rows for the same player before a `full_run` row.
- The matching window is currently `45 minutes` before the `full_run` timestamp.
- Update `player_name = 'GeeSpot'` in the SQL files if you want a different player.

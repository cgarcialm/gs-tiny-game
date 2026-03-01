# Leaderboard Backend (Cloudflare Worker)

This Worker exposes:

- `GET /leaderboard`
- `POST /submit`

All database access is server-side via Cloudflare D1.

## Setup

1. Create a D1 database:

```bash
cd backend/cloudflare
npx wrangler d1 create gs_tiny_game_leaderboard
```

2. Update `backend/cloudflare/wrangler.toml`:
- `database_id`
- `ALLOWED_ORIGINS`
3. Apply schema (remote):

```bash
npx wrangler d1 execute gs_tiny_game_leaderboard --file=./schema.sql --remote
```

## Local dev

```bash
npm install
npm run dev
```

## Local dev with local D1

```bash
npm install
npx wrangler d1 execute gs_tiny_game_leaderboard --file=./schema.sql --local
npm run dev:local
```

## Deploy

```bash
npm run deploy
```

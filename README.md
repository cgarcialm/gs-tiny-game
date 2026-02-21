# gs-tiny-game

A tiny game built with Phaser 3, TypeScript, and Vite.

## Requirements

[Node.js](https://nodejs.org/) v16+ — Install via `brew install node` or from [nodejs.org](https://nodejs.org/)

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Commands

- `npm run dev` - Dev server
- `npm run build` - Production build
- `npm run preview` - Preview build
- `npm run deploy` - Deploy to GitHub Pages

## Deployment

The game will be built and deployed to `https://cgarcialm.github.io/gs-tiny-game/`

## Leaderboard Integration

### Client configuration

Add a Vite env var for the API URL:

```bash
VITE_API_BASE_URL=https://your-leaderboard-api.example.workers.dev
```

Do not put database credentials in the client.

#### Local dev env

Create `.env.local` in the repo root:

```
VITE_API_BASE_URL=http://127.0.0.1:8787
```

#### Production env

Create `.env.production` in the repo root:

```
VITE_API_BASE_URL=https://your-leaderboard-api.example.workers.dev
```

### Backend (Cloudflare Worker + D1)

Backend files live in `backend/cloudflare`.

#### First-time setup (remote D1)

1. Create a D1 database:

```bash
cd backend/cloudflare
npx wrangler d1 create gs_tiny_game_leaderboard
```

2. Update `backend/cloudflare/wrangler.toml`:
- Set `database_id` from the create command output.
- Set `ALLOWED_ORIGINS` to include your production origin.

3. Apply schema (remote):

```bash
cd backend/cloudflare
npx wrangler d1 execute gs_tiny_game_leaderboard --file=./schema.sql --remote
```

4. Deploy API:

```bash
npm install
npm run deploy
```

#### Subsequent deploys (no DB creation)

```bash
cd backend/cloudflare
npm install
npm run deploy
```

### Local backend (D1 local)

```bash
cd backend/cloudflare
npm install
npx wrangler d1 execute gs_tiny_game_leaderboard --file=./schema.sql --local
npm run dev:local
```

### Local dev workflow

- Run the Worker in one terminal:
  - `cd backend/cloudflare`
  - `npm run dev:local`
- Run the game in another terminal:
  - `npm run dev`

### Endpoints

- `GET /leaderboard?limit=10` returns latest entries (all mini games).
- `GET /leaderboard?mini_game=ice_hockey&limit=10` returns ranked entries for a mini game.
- `POST /submit` writes a mini game score payload.

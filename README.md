# AlgoSphere

AlgoSphere is a two-part workspace:

- `frontend/`: React + Vite client
- `backend/`: Go API for auth, friends, squads, shared problems, platform metadata resolution, analytics, and challenges

## Quick Start

Frontend:

```bash
npm --prefix frontend ci
npm run dev:frontend
```

Backend:

```bash
cd backend
go run ./cmd/algosphere migrate up
go run ./cmd/algosphere serve
```

The frontend proxies `/api` to `http://127.0.0.1:8000` in development.
The backend uses SQLite by default for local work.
The production baseline in this repo is MySQL 8.4 via `compose.yaml`.

Supported problem links currently include LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, TopCoder, GeeksForGeeks, and Coder-style challenge links. The backend resolves problem metadata through a provider-style service and seeds the app with demo squads and shared problems.

## Verification

Frontend:

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

Backend:

```bash
cd backend
go test ./...
go build ./cmd/algosphere
```

## Security And Production

- Set `ALGOSPHERE_SECRET_KEY` to a strong secret that is at least 32 characters long.
- Set `ALGOSPHERE_ALLOWED_HOSTS` and `ALGOSPHERE_CORS_ORIGINS` for the domains you actually serve.
- Keep `ALGOSPHERE_SEED_DEMO_DATA=false` in production.
- Keep `ALGOSPHERE_DATABASE_AUTO_MIGRATE=false` in production and run `go run ./cmd/algosphere migrate up` explicitly before rollout.
- Keep `ALGOSPHERE_ENABLE_ADMIN=false` unless you also set `ALGOSPHERE_ADMIN_EMAILS` explicitly.
- Login attempts are rate-limited, JWTs carry issuer and token-type claims, and API responses send defensive security headers.
- The current hosted deployment path in this repo is documented in `DEPLOYMENT.md` and targets Render for the backend.

To run the container stack:

```bash
docker compose up --build
```

Copy `.env.example` to `.env` first and replace the placeholder secrets.

## Demo Account

If demo seeding is enabled, sign in with:

- Email: `alex@example.com`
- Password: `AlgoSphere!123`

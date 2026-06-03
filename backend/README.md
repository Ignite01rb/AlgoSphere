# AlgoSphere Backend

Go backend for authentication, squads, friends, shared problem ingestion, analytics, and challenges.

## Run

```bash
go run ./cmd/algosphere migrate up
go run ./cmd/algosphere serve
```

## Migrations

Run schema updates explicitly before a production rollout:

```bash
go run ./cmd/algosphere migrate up
```

## Verify

```bash
go test ./...
go build ./cmd/algosphere
```

## Key Settings

- Local development can use SQLite or MySQL-compatible databases.
- Production requires MySQL-compatible storage, a non-default `ALGOSPHERE_SECRET_KEY` that is at least 32 characters long, docs disabled, and demo seeding disabled.
- Keep `ALGOSPHERE_DATABASE_AUTO_MIGRATE=false` in production and run `go run ./cmd/algosphere migrate up` separately before the service starts.
- Startup schema checks are read-only when `ALGOSPHERE_DATABASE_AUTO_MIGRATE=false`; the API will tell you to run `algosphere migrate up` instead of mutating production schema state on boot.
- `ALGOSPHERE_RUN_STARTUP_TASKS_ON_APP_START` controls whether demo seeding and in-memory search-index warmup run during API startup.
- `ALGOSPHERE_AUTH_RATE_LIMIT_MAX_ATTEMPTS` and `ALGOSPHERE_AUTH_RATE_LIMIT_WINDOW_SECONDS` control login throttling.
- `ALGOSPHERE_ADMIN_RATE_LIMIT_MAX_ATTEMPTS` and `ALGOSPHERE_ADMIN_RATE_LIMIT_WINDOW_SECONDS` control admin login throttling.
- `ALGOSPHERE_FRIEND_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS` and `ALGOSPHERE_FRIEND_LOOKUP_RATE_LIMIT_WINDOW_SECONDS` control friend-search throttling.
- `ALGOSPHERE_ENABLE_ADMIN` stays `false` by default; only enable it together with `ALGOSPHERE_ADMIN_EMAILS`.

## Problem Metadata

Problem URLs are resolved through a metadata service that normalizes platform links and returns a consistent problem snapshot. The backend supports LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, TopCoder, GeeksForGeeks, and Coder-style challenge links.

## Container Startup

The production image now starts the Go binary directly on port `8000`. Database migrations are intentionally not run at boot in production, and the API does not create migration-tracking tables during a production readiness check.

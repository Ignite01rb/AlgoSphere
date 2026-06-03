# TrieQuest Frontend

Vite + React client for TrieQuest.

## Run

```bash
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` if you do not want to use the local Vite proxy.

- Use `/api` when the frontend and backend are served behind the same public reverse proxy.
- Use `https://api.example.com` when the frontend is deployed separately from the backend.

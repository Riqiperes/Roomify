## Roomify — local development

Quick instructions to run this project (frontend + backend) locally using Docker Compose or directly with Node.

Prerequisites
- Docker & Docker Compose
- Node.js (for local development without Docker)
- A Spotify Developer app (client ID + secret)

1) Setup environment variables

- Create `backend/.env` (DO NOT commit this file). Example contents:

```
PORT=8080
SESSION_SECRET=your-secret
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
# IMPORTANT: use 127.0.0.1 (Spotify rejects http://localhost redirect URIs)
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/callback
FRONTEND_URL=http://127.0.0.1:5173
```

- In the Spotify Developer Dashboard for your app, add the Redirect URI above exactly as `http://127.0.0.1:8080/callback`.

2) Run with Docker Compose (recommended)

- From the repository root:

```powershell
cd C:\Users\Riqiperes\Desktop\Roomify
# Build and start both services
docker compose up --build

# Or build/start one service while developing:
docker compose up --build backend
docker compose up --build frontend
```

Notes about the frontend build step
- The frontend is a Vite app that is built at image build time and then served by nginx.
- The Dockerfile supports a build ARG `VITE_BACKEND_URL` so the built assets point to the correct backend host. The compose file already sets this to `http://127.0.0.1:8080`.

If you need to rebuild the frontend and force a specific backend URL:

```powershell
docker compose build --no-cache --build-arg VITE_BACKEND_URL=http://127.0.0.1:8080 frontend
docker compose up --no-deps --build frontend
```

3) Open the app

- Visit: http://127.0.0.1:5173
- Click "Conectar con Spotify" to start the OAuth flow.

Troubleshooting
- Invalid state/code (common):
  - Make sure you open the frontend using `127.0.0.1` (not `localhost`). Spotify's redirect URI rules may block `http://localhost`.
  - Clear cookies for `127.0.0.1` and `localhost` in your browser before retrying.
  - Ensure `backend/.env` has `SPOTIFY_REDIRECT_URI` set to `http://127.0.0.1:8080/callback` and that same URI is registered in Spotify Dashboard.

- Cookie not being sent:
  - Use the same hostname for frontend and backend (127.0.0.1).
  - Backend sets cookies without the `domain` attribute (correct for local dev).

- Frontend build errors (vite / missing files):
  - If you see `vite: not found` or similar during Docker build, ensure the Dockerfile runs `npm run build` (not `npm run dev`) and that `node_modules` are installed during build.

- See logs for details:

```powershell
docker compose logs -f backend
docker compose logs -f frontend
```

Running without Docker (fast iteration)

- Frontend (dev server):
```powershell
cd frontend
npm install
npm run dev
# open http://127.0.0.1:5173 (Vite dev server)
```

- Backend (local Node):
```powershell
cd backend
npm install
npm start
# backend will listen on PORT from backend/.env (default 8080)
```

Notes on security / git
- Do not commit `backend/.env` — it contains secrets. Add it to `.gitignore` if needed.
- To commit & push changes (quick):

```powershell
git add -A
git commit -m "Describe changes"
git push -u origin main
```

Useful endpoints
- `GET /login` — redirect to Spotify authorization.
- `GET /callback` — OAuth callback (backend exchanges code for tokens).
- `GET /api/me` — current Spotify user (requires session).
- `GET /api/top-artists?limit=15&term=medium_term`
- `GET /api/top-tracks?limit=15&term=medium_term`
- `GET /api/saved-albums?limit=10`
- `GET /api/multiple-artists?ids=id1,id2`
- `GET /api/multiple-tracks?ids=id1,id2`
- `GET /api/multiple-albums?ids=id1,id2`

If something still fails, paste the backend logs (`docker compose logs backend`) and I can help diagnose further.

---
Edited: concise developer notes for local dev (Windows PowerShell). Keep your `.env` secrets safe.

# Sign Up Info

A statistics dashboard for viewing Scoutnet sign-up data. It shows aggregated
participation statistics for scout groups registered in a Scoutnet project,
with filtering, grouping, and a full table view.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│  React SPA (Vite + MUI + TanStack Query/Table/Virtual)      │
└──────────────────────────┬──────────────────────────────────┘
                           │ /api/* (proxied in dev)
┌──────────────────────────▼──────────────────────────────────┐
│  FastAPI backend  (Python 3.12, uvicorn)                    │
│  – Fetches and caches data from the Scoutnet API            │
│  – JWT auth via Keycloak (cookie-based)                     │
│  – Serves built React static files in production            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│  Scoutnet API  (external)                                   │
└─────────────────────────────────────────────────────────────┘
```

The project is deployed as a single Docker container: the React app is built
at image-build time and served as static files by FastAPI. In development, the
client dev server (Vite) proxies `/api` to the Python backend running locally.

## Prerequisites

- **Node.js** v24 (see `client/.node-version`)
- **Python** 3.12+
- A `.env` file in `pyapp/` with the required variables (see below)

## Local Development

### 1. Start the backend

```bash
cd pyapp
pip install -r requirements.txt
python start.py
```

The API will be available at `http://127.0.0.1:8000`.

### 2. Start the frontend dev server

```bash
cd client
npm install
npm run dev
```

The app will open at `http://localhost:5173`. The Vite dev server proxies all
`/api` requests to the backend automatically.

## Environment Variables

Create `pyapp/.env` with the following keys:

```env
# Required — one entry per Scoutnet project (JSON array).
# Each project needs API keys from the Scoutnet admin panel.
SCOUTNET_PROJECTS='[{"id": 12345, "name": "My Project", "member_key": "...", "question_key": "...", "group_key": "..."}]'

# Required in production — generate a strong random string.
SESSION_SECRET_KEY=change-me

# Optional — Scoutnet body list for resolving group names.
SCOUTNET_BODYLIST_ID=692
SCOUTNET_BODYLIST_KEY=

# Optional — how long (in hours) to keep data in memory before re-fetching.
PROJECT_CACHE_MAX_AGE_H=24

# Optional — set to true to bypass JWT authentication (development only).
AUTH_DISABLED=false

# Optional — set to true for DEBUG-level Python logging.
DEBUG=false
```

## Docker

### Build

```bash
docker build -t signupinfo .
```

### Run

```bash
docker run -p 8000:8000 \
  -e SCOUTNET_PROJECTS='[{"id":12345,"name":"My Project","member_key":"...","question_key":"...","group_key":"..."}]' \
  -e SESSION_SECRET_KEY=your-secret-key \
  signupinfo
```

The app will be available at `http://localhost:8000`.

## Project Structure

```
.
├── client/          # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   └── smart-table/ # TanStack Table renderer with sort/filter/resize
│   │   ├── constants/       # Shared constants (selectionTypes, layout)
│   │   ├── hooks/           # Custom React hooks (data fetching, UI state)
│   │   ├── services/        # API client (api.js)
│   │   └── utils/           # Pure utility functions
│   ├── biome.json           # Linter & formatter config
│   └── package.json
├── pyapp/           # FastAPI backend
│   ├── app/
│   │   ├── main.py          # App setup, routers, static file serving
│   │   ├── stats.py         # API route handlers
│   │   ├── scoutnet.py      # Scoutnet API client & in-memory cache
│   │   ├── scoutnet_forms.py# Data processing & aggregation
│   │   ├── authenctication.py # JWT / Keycloak auth
│   │   └── config.py        # Pydantic settings (loaded from .env)
│   ├── requirements.txt
│   └── start.py             # Uvicorn entrypoint
└── Dockerfile       # Multi-stage build (Node → Python)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 |
| UI components | MUI (Material UI) v7 |
| Data fetching | TanStack Query v5 |
| Table | TanStack Table v8 |
| Virtualisation | TanStack Virtual v3 |
| Fuzzy search | Fuse.js 7 |
| Build tool | Vite 6 + SWC |
| Type checking | TypeScript 5 (strict, JS+TS mixed) |
| Linter / Formatter | Biome 2 |
| Backend framework | FastAPI 0.128 |
| Backend server | Uvicorn |
| Auth | Keycloak (JWT, joserfc) |
| Containerisation | Docker (multi-stage) |

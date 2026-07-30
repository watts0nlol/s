# Student Assignment Tracker
CPAN 366 - Project - By BATmen - Alexander Watson, Ibrahim Hagi, Tsering Lama, and Brandon Pagani Lozano

## Setup

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0` (required by Vite 8). Check your version with `node -v`.
  - On Windows, you can upgrade with `winget upgrade --id OpenJS.NodeJS.20`.
  - If you upgrade Node after already running `npm install`, delete `node_modules` and run `npm install` again — otherwise platform-specific native bindings (e.g. for Vite/Rolldown) may be missing and `npm run dev`/`npm run build` will fail with a `MODULE_NOT_FOUND` error.

### Install

```bash
npm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values (JWT secret, email credentials, etc.):

```bash
cp .env.example .env
```

### Running the app

The frontend and backend run as separate processes:

```bash
# Frontend (Vite dev server)
npm run dev

# Backend (Express + Socket.IO API)
node server/index.js
```

## CI/CD

This repo is the canonical repo for both deploys. Every push/PR to `main` runs lint + build
via GitHub Actions (`.github/workflows/ci-cd.yml`). On push to `main`, it also triggers a
backend deploy on Render.

- **Frontend → Vercel**, deployed via Vercel's own GitHub integration connected to this repo
  (builds/deploys automatically on push, independent of the Actions workflow).
- **Backend → Render** (Express/Socket.IO server, via `render.yaml` + an Actions deploy hook).

### One-time setup (per maintainer)

1. **Render (backend)**
   - Create (or reconnect) a Web Service on [Render](https://render.com) pointing at this repo. Render will pick up `render.yaml` automatically.
   - In the Render dashboard, set the `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS` env vars on the service.
   - Under the service's **Settings → Deploy Hook**, copy the deploy hook URL.
   - In this GitHub repo, add it as secret `RENDER_DEPLOY_HOOK_URL` (Settings → Secrets and variables → Actions).
   - Note the service's public URL (e.g. `https://student-tracker-api.onrender.com`) — needed below.

2. **Vercel (frontend)**
   - In the Vercel dashboard for this project, go to Settings → Environment Variables and set
     `VITE_API_URL` = your Render backend URL from step 1.
   - No GitHub secrets are needed for Vercel — it deploys directly, not through Actions.

> Note: the backend currently stores data in memory (see `server/models/`), so every backend redeploy/restart resets all data. Fine for a class project demo; would need a real database for persistent data.

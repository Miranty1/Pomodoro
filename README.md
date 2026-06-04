# Paul — The Pomodoro Timer

A focused Pomodoro timer built with React + Vite. Tracks sessions, streaks, tasks, and focus scores. Spotify playback control optional.

## Local development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`

## Build

```bash
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**
3. Import your GitHub repository — framework preset auto-detects as **Vite**
4. Add environment variables under **Settings → Environment Variables** (see below)
5. Click **Deploy**

`vercel.json` configures SPA client-side routing rewrites so deep links and the Spotify OAuth callback work correctly.

## Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `VITE_SPOTIFY_CLIENT_ID` | Optional | Spotify app client ID — enables the Music card |
| `VITE_SPOTIFY_REDIRECT_URI` | Optional | OAuth redirect URI — must match exactly what's registered in your Spotify app |

### Spotify redirect URI

Register **both** URIs in your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) under **Redirect URIs**:

- Local: `http://localhost:5173/callback`
- Production: `https://<your-project>.vercel.app/callback`

Set `VITE_SPOTIFY_REDIRECT_URI` to the URI for each environment. In Vercel, add it as an environment variable scoped to **Production** and a separate one scoped to **Preview/Development** with the localhost value.

## Data storage

All app data lives in `localStorage` — no backend required. Keys:

| Key | Shape |
|---|---|
| `tasks` | `[{ id, title, estimatedPomodoros, completedPomodoros, done }]` |
| `sessions` | `[{ date: 'YYYY-MM-DD', count: number }]` |
| `badges` | `[{ id, unlockedAt: ISO string }]` |
| `stats` | `{ totalSessions, currentStreak, longestStreak }` |
| `settings` | `{ workMins, breakMins, longBreakMins, dailyGoal, startHour, endHour, notifications }` |
| `calendarDays` | `{ 'YYYY-MM-DD': { planned, actual } }` |

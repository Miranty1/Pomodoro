# Paul - The Pomodoro Timer

A focused Pomodoro timer app built with React + Vite.

## Local Development

```bash
npm install
npm run dev
```

App runs at http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**
3. Import your GitHub repository
4. Framework preset is detected automatically as **Vite**
5. No extra build settings needed — click **Deploy**

The `vercel.json` in this repo configures SPA client-side routing rewrites automatically.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

To add environment variables in Vercel: go to your project → **Settings** → **Environment Variables**. All variable names must use the `VITE_` prefix.

## Data Storage

All app data is stored in the browser's `localStorage` under these keys:

| Key | Shape |
|-----|-------|
| `tasks` | `[{ id, title, estimatedPomodoros, completedPomodoros, done }]` |
| `sessions` | `[{ id, taskId, date, startTime, endTime, completed }]` |
| `calendarDays` | `{ 'YYYY-MM-DD': { planned: [], actual: [] } }` |
| `badges` | `[{ id, unlockedAt }]` |
| `stats` | `{ totalSessions, currentStreak, longestStreak }` |
| `settings` | `{ workMins, breakMins, longBreakMins, dailyGoal, startHour, endHour }` |

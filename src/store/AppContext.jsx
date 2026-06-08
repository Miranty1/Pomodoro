import { createContext, useContext, useEffect, useRef, useState } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

const DEFAULT_SETTINGS = {
  workMins: 25,
  breakMins: 5,
  longBreakMins: 15,
  dailyGoal: 8,
  startHour: 6,
  endHour: 22,
  notifications: false,
}

const DEFAULT_STATS = {
  totalSessions: 0,
  currentStreak: 0,
  longestStreak: 0,
}

// ── Shape converters (app ↔ Supabase rows) ──────────────────────────────────

function rowsToCalendarDays(rows) {
  return rows.reduce((acc, r) => {
    acc[r.date] = { planned: r.planned, actual: r.actual }
    return acc
  }, {})
}

function calendarDaysToRows(obj, userId) {
  return Object.entries(obj).map(([date, v]) => ({
    user_id: userId,
    date,
    planned: v.planned ?? 0,
    actual: v.actual ?? 0,
  }))
}

function rowsToBadges(rows) {
  return rows.map(r => ({ id: r.badge_id, unlockedAt: r.unlocked_at }))
}

function badgesToRows(badges, userId) {
  return badges.map(b => ({
    user_id: userId,
    badge_id: b.id ?? b.badge_id,
    unlocked_at: b.unlockedAt ?? b.unlocked_at ?? new Date().toISOString(),
  }))
}

function rowToStats(row) {
  if (!row) return DEFAULT_STATS
  return {
    totalSessions: row.total_sessions,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
  }
}

function statsToRow(stats, userId) {
  return {
    user_id: userId,
    total_sessions: stats.totalSessions,
    current_streak: stats.currentStreak,
    longest_streak: stats.longestStreak,
  }
}

function rowToSettings(row) {
  if (!row) return DEFAULT_SETTINGS
  return {
    workMins: row.work_mins,
    breakMins: row.break_mins,
    longBreakMins: row.long_break_mins,
    dailyGoal: row.daily_goal,
    startHour: row.start_hour,
    endHour: row.end_hour,
    notifications: row.notifications,
  }
}

function settingsToRow(settings, userId) {
  return {
    user_id: userId,
    work_mins: settings.workMins,
    break_mins: settings.breakMins,
    long_break_mins: settings.longBreakMins,
    daily_goal: settings.dailyGoal,
    start_hour: settings.startHour,
    end_hour: settings.endHour,
    notifications: settings.notifications,
  }
}

function rowsToTasks(rows) {
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    estimatedPomodoros: r.estimated_pomodoros,
    completedPomodoros: r.completed_pomodoros,
    done: r.done,
    createdAt: r.created_at,
  }))
}

function tasksToRows(tasks, userId) {
  return tasks.map(t => ({
    id: t.id,
    user_id: userId,
    title: t.title,
    estimated_pomodoros: t.estimatedPomodoros ?? t.estimated_pomodoros ?? 1,
    completed_pomodoros: t.completedPomodoros ?? t.completed_pomodoros ?? 0,
    done: t.done ?? false,
    created_at: t.createdAt ?? t.created_at ?? new Date().toISOString(),
  }))
}

function rowsToSessions(rows) {
  return rows.map(r => ({
    id: r.id,
    taskId: r.task_id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    completed: r.completed,
  }))
}

function sessionsToRows(sessions, userId) {
  return sessions.map(s => ({
    id: s.id,
    user_id: userId,
    task_id: s.taskId ?? s.task_id ?? null,
    date: s.date ?? null,
    start_time: s.startTime ?? s.start_time ?? null,
    end_time: s.endTime ?? s.end_time ?? null,
    completed: s.completed ?? true,
  }))
}

// ── Supabase fetch helpers ──────────────────────────────────────────────────

async function fetchAll(userId) {
  const [tasks, sessions, calDays, badges, stats, settings] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('sessions').select('*').eq('user_id', userId),
    supabase.from('calendar_days').select('*').eq('user_id', userId),
    supabase.from('badges').select('*').eq('user_id', userId),
    supabase.from('stats').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
  ])
  return { tasks, sessions, calDays, badges, stats, settings }
}

async function migrateToSupabase(userId, local) {
  const ops = []

  if (local.tasks?.length) {
    ops.push(supabase.from('tasks').upsert(tasksToRows(local.tasks, userId)))
  }
  if (local.sessions?.length) {
    ops.push(supabase.from('sessions').upsert(sessionsToRows(local.sessions, userId)))
  }
  if (local.calendarDays && Object.keys(local.calendarDays).length) {
    ops.push(supabase.from('calendar_days').upsert(calendarDaysToRows(local.calendarDays, userId), { onConflict: 'user_id,date' }))
  }
  if (local.badges?.length) {
    ops.push(supabase.from('badges').upsert(badgesToRows(local.badges, userId), { onConflict: 'user_id,badge_id' }))
  }
  if (local.stats) {
    ops.push(supabase.from('stats').upsert(statsToRow(local.stats, userId)))
  }
  if (local.settings) {
    ops.push(supabase.from('settings').upsert(settingsToRow(local.settings, userId)))
  }

  await Promise.all(ops)
}

// ── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  const { user } = useAuth()
  const [activeTaskId, setActiveTaskId] = useState(null)
  const [badgeToasts, setBadgeToasts] = useState([])

  const [tasks, setTasksLocal]           = useLocalStorage('tasks', [])
  const [sessions, setSessionsLocal]     = useLocalStorage('sessions', [])
  const [calendarDays, setCalendarDaysLocal] = useLocalStorage('calendarDays', {})
  const [badges, setBadgesLocal]         = useLocalStorage('badges', [])
  const [stats, setStatsLocal]           = useLocalStorage('stats', DEFAULT_STATS)
  const [settings, setSettingsLocal]     = useLocalStorage('settings', DEFAULT_SETTINGS)

  // Track which session IDs we've already synced so we don't double-insert
  const syncedSessionIds = useRef(new Set())

  // ── Load from Supabase when user authenticates ──────────────────────────
  useEffect(() => {
    if (!user) return

    async function load() {
      const { tasks: t, sessions: s, calDays, badges: b, stats: st, settings: se } = await fetchAll(user.id)

      const hasRemoteData =
        (t.data?.length ?? 0) > 0 ||
        (s.data?.length ?? 0) > 0 ||
        (calDays.data?.length ?? 0) > 0 ||
        (b.data?.length ?? 0) > 0 ||
        st.data !== null ||
        se.data !== null

      if (!hasRemoteData) {
        // First login — migrate any local data up to Supabase
        const localTasks    = JSON.parse(localStorage.getItem('tasks')    || '[]')
        const localSessions = JSON.parse(localStorage.getItem('sessions') || '[]')
        const localCalDays  = JSON.parse(localStorage.getItem('calendarDays') || '{}')
        const localBadges   = JSON.parse(localStorage.getItem('badges')   || '[]')
        const localStats    = JSON.parse(localStorage.getItem('stats')    || 'null')
        const localSettings = JSON.parse(localStorage.getItem('settings') || 'null')

        const hasLocalData =
          localTasks.length || localSessions.length ||
          Object.keys(localCalDays).length || localBadges.length ||
          localStats || localSettings

        if (hasLocalData) {
          await migrateToSupabase(user.id, {
            tasks: localTasks,
            sessions: localSessions,
            calendarDays: localCalDays,
            badges: localBadges,
            stats: localStats,
            settings: localSettings,
          })
        }
        // Mark already-synced sessions
        localSessions.forEach(s => syncedSessionIds.current.add(s.id))
        return
      }

      // Supabase has data — load it into state (and update localStorage cache)
      if (t.data) { const v = rowsToTasks(t.data); setTasksLocal(v) }
      if (s.data) {
        const v = rowsToSessions(s.data)
        setSessionsLocal(v)
        v.forEach(s => syncedSessionIds.current.add(s.id))
      }
      if (calDays.data) { setCalendarDaysLocal(rowsToCalendarDays(calDays.data)) }
      if (b.data)       { setBadgesLocal(rowsToBadges(b.data)) }
      if (st.data)      { setStatsLocal(rowToStats(st.data)) }
      if (se.data)      { setSettingsLocal(rowToSettings(se.data)) }
    }

    load().catch(err => console.error('Supabase load failed:', err))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync-up on reconnect ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    function handleOnline() {
      supabase.from('tasks').upsert(tasksToRows(tasks, user.id)).catch(() => {})
      supabase.from('sessions').upsert(sessionsToRows(sessions, user.id)).catch(() => {})
      supabase.from('calendar_days').upsert(calendarDaysToRows(calendarDays, user.id), { onConflict: 'user_id,date' }).catch(() => {})
      supabase.from('badges').upsert(badgesToRows(badges, user.id), { onConflict: 'user_id,badge_id' }).catch(() => {})
      supabase.from('stats').upsert(statsToRow(stats, user.id)).catch(() => {})
      supabase.from('settings').upsert(settingsToRow(settings, user.id)).catch(() => {})
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [user, tasks, sessions, calendarDays, badges, stats, settings]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Write-through setters ───────────────────────────────────────────────

  function setTasks(value) {
    const next = value instanceof Function ? value(tasks) : value
    setTasksLocal(next)
    if (!user || !navigator.onLine) return
    // Upsert all current tasks; if a task was removed, delete it
    const nextIds = new Set(next.map(t => t.id))
    const removed = tasks.filter(t => !nextIds.has(t.id))
    supabase.from('tasks').upsert(tasksToRows(next, user.id)).catch(() => {})
    if (removed.length) {
      supabase.from('tasks').delete().in('id', removed.map(t => t.id)).catch(() => {})
    }
  }

  function setSessions(value) {
    const next = value instanceof Function ? value(sessions) : value
    setSessionsLocal(next)
    if (!user || !navigator.onLine) return
    const newRows = next.filter(s => !syncedSessionIds.current.has(s.id))
    if (newRows.length) {
      supabase.from('sessions').upsert(sessionsToRows(newRows, user.id)).then(() => {
        newRows.forEach(s => syncedSessionIds.current.add(s.id))
      }).catch(() => {})
    }
  }

  function setCalendarDays(value) {
    const next = value instanceof Function ? value(calendarDays) : value
    setCalendarDaysLocal(next)
    if (!user || !navigator.onLine) return
    supabase.from('calendar_days').upsert(calendarDaysToRows(next, user.id), { onConflict: 'user_id,date' }).catch(() => {})
  }

  function setBadges(value) {
    const next = value instanceof Function ? value(badges) : value
    setBadgesLocal(next)
    if (!user || !navigator.onLine) return
    supabase.from('badges').upsert(badgesToRows(next, user.id), { onConflict: 'user_id,badge_id' }).catch(() => {})
  }

  function setStats(value) {
    const next = value instanceof Function ? value(stats) : value
    setStatsLocal(next)
    if (!user || !navigator.onLine) return
    supabase.from('stats').upsert(statsToRow(next, user.id)).catch(() => {})
  }

  function setSettings(value) {
    const next = value instanceof Function ? value(settings) : value
    setSettingsLocal(next)
    if (!user || !navigator.onLine) return
    supabase.from('settings').upsert(settingsToRow(next, user.id)).catch(() => {})
  }

  return (
    <AppContext.Provider value={{
      activeTaskId, setActiveTaskId,
      badgeToasts, setBadgeToasts,
      tasks, setTasks,
      sessions, setSessions,
      calendarDays, setCalendarDays,
      badges, setBadges,
      stats, setStats,
      settings, setSettings,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export default AppContext

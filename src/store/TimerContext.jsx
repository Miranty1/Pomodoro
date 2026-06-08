import { createContext, useContext, useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { useApp } from './AppContext'
import { checkBadges } from '../lib/badges'

const TimerContext = createContext(null)

export const MODES = {
  pomodoro:   { label: 'Pomodoro',    key: 'workMins' },
  shortBreak: { label: 'Short Break', key: 'breakMins' },
  longBreak:  { label: 'Long Break',  key: 'longBreakMins' },
}

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return localDateStr()
}

function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return localDateStr(d)
}

function recalculateStreak(newSessions, currentStreak) {
  const today = todayStr()
  const yesterday = yesterdayStr()
  const todayEntry = newSessions.find(s => s.date === today)
  const yesterdayEntry = newSessions.find(s => s.date === yesterday)
  if (todayEntry && todayEntry.count > 1) return currentStreak
  return (yesterdayEntry && yesterdayEntry.count > 0) ? currentStreak + 1 : 1
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
      osc.start(t)
      osc.stop(t + 0.8)
    })
  } catch {}
}

function triggerConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.5 },
    colors: ['#E8524A', '#ffffff', '#ff9999', '#ffcc00'],
    disableForReducedMotion: true,
  })
}

export function TimerProvider({ children }) {
  const { tasks, setTasks, sessions, setSessions, stats, setStats, settings, activeTaskId, badges, setBadges, setBadgeToasts } = useApp()

  const [mode, setMode] = useState('pomodoro')
  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [completePulse, setCompletePulse] = useState(false)

  const intervalRef = useRef(null)
  const modeRef = useRef('pomodoro')
  const activeTaskIdRef = useRef(null)
  const sessionStartHour = useRef(null)
  const timerStartRef = useRef(null)
  const timeLeftAtStartRef = useRef(null)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { activeTaskIdRef.current = activeTaskId }, [activeTaskId])

  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(settings[MODES[mode].key] * 60)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.workMins, settings.breakMins, settings.longBreakMins, mode])

  useEffect(() => {
    if (!isRunning) return
    timerStartRef.current = Date.now()
    timeLeftAtStartRef.current = timeLeft

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const next = timeLeftAtStartRef.current - elapsed
      if (next <= 0) {
        clearInterval(intervalRef.current)
        setTimeLeft(0)
        handleSessionComplete()
      } else {
        setTimeLeft(next)
      }
    }, 1000)
    return () => clearInterval(intervalRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  useEffect(() => {
    if (!isRunning) return
    const onVisible = () => {
      if (document.hidden) return
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const next = timeLeftAtStartRef.current - elapsed
      if (next <= 0) {
        clearInterval(intervalRef.current)
        setTimeLeft(0)
        handleSessionComplete()
      } else {
        setTimeLeft(next)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  function switchMode(newMode) {
    clearInterval(intervalRef.current)
    setMode(newMode)
    setIsRunning(false)
    setTimeLeft(settings[MODES[newMode].key] * 60)
  }

  function handleSessionComplete() {
    if (modeRef.current !== 'pomodoro') {
      switchMode('pomodoro')
      return
    }
    playChime()
    triggerConfetti()
    setCompletePulse(true)
    setTimeout(() => setCompletePulse(false), 1200)
    if ((settings.notifications ?? false) && Notification.permission === 'granted') {
      new Notification('Session complete', { body: 'Time for a break. Great work.' })
    }
    updateSessionsAndStats()
    setIsRunning(false)
    setTimeout(() => switchMode('shortBreak'), 100)
  }

  function updateSessionsAndStats() {
    const today = todayStr()
    const newSessions = sessions.some(s => s.date === today)
      ? sessions.map(s => s.date === today ? { ...s, count: s.count + 1 } : s)
      : [...sessions, { date: today, count: 1 }]

    setSessions(newSessions)

    const newStreak = recalculateStreak(newSessions, stats.currentStreak)
    setStats({
      totalSessions: stats.totalSessions + 1,
      currentStreak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
    })

    if (activeTaskIdRef.current !== null) {
      setTasks(prev => prev.map(t =>
        t.id === activeTaskIdRef.current
          ? { ...t, completedPomodoros: (t.completedPomodoros ?? 0) + 1 }
          : t
      ))
    }

    const newStats = {
      totalSessions: stats.totalSessions + 1,
      currentStreak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
    }
    const { newBadges, newlyUnlocked } = checkBadges({
      newSessions,
      newStats,
      settings,
      badges,
      startHour: sessionStartHour.current ?? new Date().getHours(),
      completeHour: new Date().getHours(),
    })
    if (newlyUnlocked.length > 0) {
      setBadges(newBadges)
      setBadgeToasts(prev => [...prev, ...newlyUnlocked])
    }
  }

  function handleStart() {
    sessionStartHour.current = new Date().getHours()
    setIsRunning(true)
  }

  function handleStop() {
    clearInterval(intervalRef.current)
    setIsRunning(false)
  }

  function handleReset() {
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setTimeLeft(settings[MODES[mode].key] * 60)
  }

  return (
    <TimerContext.Provider value={{
      mode, isRunning, timeLeft, completePulse,
      switchMode, handleStart, handleStop, handleReset,
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within TimerProvider')
  return ctx
}

export default TimerContext

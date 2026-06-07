import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useApp } from '../store/AppContext'
import { checkBadges } from '../lib/badges'
import './PomodoroTimer.css'

const MODES = {
  pomodoro:   { label: 'Pomodoro',    key: 'workMins' },
  shortBreak: { label: 'Short Break', key: 'breakMins' },
  longBreak:  { label: 'Long Break',  key: 'longBreakMins' },
}

const CLOCK_RADIUS = 120
const CIRCUMFERENCE = 2 * Math.PI * CLOCK_RADIUS

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function recalculateStreak(newSessions, currentStreak) {
  const today = todayStr()
  const yesterday = yesterdayStr()
  const todayEntry = newSessions.find(s => s.date === today)
  const yesterdayEntry = newSessions.find(s => s.date === yesterday)

  // Not the first session today — streak already counted
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

export default function PomodoroTimer() {
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

  // Keep modeRef in sync
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { activeTaskIdRef.current = activeTaskId }, [activeTaskId])

  // Init / reset timeLeft when mode or settings change (only when not running)
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(settings[MODES[mode].key] * 60)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.workMins, settings.breakMins, settings.longBreakMins, mode])

  // Countdown tick — timestamp-based so minimized/background tabs stay accurate
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
  // handleSessionComplete is stable (reads refs, not state)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  // Catch up immediately when the tab becomes visible again
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

  const totalSeconds = settings[MODES[mode].key] * 60
  const safeTimeLeft = timeLeft ?? totalSeconds
  const elapsed = totalSeconds - safeTimeLeft
  const arcLength = totalSeconds > 0 ? (elapsed / totalSeconds) * CIRCUMFERENCE : 0

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
    // Delay mode switch so stats update settles first
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

  function calcFocusScore() {
    const today = todayStr()
    const sessionsToday = sessions.find(s => s.date === today)?.count ?? 0
    const goalScore = Math.min(sessionsToday / (settings.dailyGoal || 1), 1) * 50
    const streakScore = Math.min(stats.currentStreak * 5, 30)
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (7 - i))
      return d.toISOString().slice(0, 10)
    })
    const activeDays = last7.filter(d => sessions.some(s => s.date === d && s.count > 0)).length
    const consistencyBonus = (activeDays / 7) * 20
    return Math.round(goalScore + streakScore + consistencyBonus)
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
    setTimeLeft(totalSeconds)
  }

  const activeTask = tasks.find(t => t.id === activeTaskId) ?? null
  const focusScore = calcFocusScore()

  return (
    <div className="card pomodoro-timer">
      {/* Left column: tabs + clock + controls */}
      <div className="timer-left">
        <div className="mode-tabs">
          {Object.entries(MODES).map(([key, { label }]) => (
            <button
              key={key}
              className={`mode-tab${mode === key ? ' active' : ''}`}
              onClick={() => switchMode(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="timer-clock-wrap">
          <svg className={`timer-svg${completePulse ? ' timer-svg--complete' : ''}`} viewBox="0 0 270 270">
            {/* Background ring */}
            <circle cx="135" cy="135" r="120" fill="none" stroke="#333" strokeWidth="2" />

            {/* Elapsed arc */}
            <circle
              className={isRunning ? 'timer-arc--running' : ''}
              cx="135"
              cy="135"
              r={CLOCK_RADIUS}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`}
              transform="rotate(-90 135 135)"
            />

            {/* Tick marks */}
            {Array.from({ length: 60 }, (_, i) => {
              const rad = ((i / 60) * 360 - 90) * (Math.PI / 180)
              const isMajor = i % 5 === 0
              const outerR = 118
              const innerR = isMajor ? 104 : 110
              return (
                <line
                  key={i}
                  x1={135 + outerR * Math.cos(rad)}
                  y1={135 + outerR * Math.sin(rad)}
                  x2={135 + innerR * Math.cos(rad)}
                  y2={135 + innerR * Math.sin(rad)}
                  stroke={isMajor ? '#666' : '#3a3a3a'}
                  strokeWidth={isMajor ? 2 : 1}
                />
              )
            })}


            {/* Countdown text */}
            <text
              x="135"
              y="135"
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--text-primary)"
              fontSize="46"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="500"
              letterSpacing="-0.5"
            >
              {formatTime(safeTimeLeft)}
            </text>
          </svg>
        </div>

        {/* Controls */}
        <div className="timer-controls">
          <button className="btn-icon" onClick={handleReset} title="Reset">↺</button>
          <button className="btn-start" onClick={isRunning ? handleStop : handleStart}>
            {isRunning ? 'Pause' : 'Start Session'}
          </button>
          <button className="btn-icon" onClick={handleStop} title="Stop">■</button>
        </div>
      </div>

      {/* Side stats */}
      <div className="timer-side-stats">
        <div className="active-task">
          <span className="active-task-label">Current Task</span>
          <span className="active-task-name">
            {activeTask ? activeTask.title : 'No task selected'}
          </span>
        </div>
        <div className="timer-meta">
          <div className="meta-item">
            <div className="meta-value">{stats.currentStreak}</div>
            <div className="meta-label">Streak</div>
          </div>
          <div className="meta-item">
            <div className="meta-value">{focusScore}</div>
            <div className="meta-label">Focus</div>
          </div>
        </div>
      </div>
    </div>
  )
}

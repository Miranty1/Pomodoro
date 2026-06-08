import { useApp } from '../store/AppContext'
import { useTimer, MODES } from '../store/TimerContext'
import './PomodoroTimer.css'

const CLOCK_RADIUS = 120
const CIRCUMFERENCE = 2 * Math.PI * CLOCK_RADIUS

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function PomodoroTimer() {
  const { tasks, sessions, stats, settings, activeTaskId } = useApp()
  const { mode, isRunning, timeLeft, completePulse, switchMode, handleStart, handleStop, handleReset } = useTimer()

  const totalSeconds = settings[MODES[mode].key] * 60
  const safeTimeLeft = timeLeft ?? totalSeconds
  const elapsed = totalSeconds - safeTimeLeft
  const arcLength = totalSeconds > 0 ? (elapsed / totalSeconds) * CIRCUMFERENCE : 0

  const activeTask = tasks.find(t => t.id === activeTaskId) ?? null

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

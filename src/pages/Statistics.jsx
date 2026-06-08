import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { BADGE_DEFS } from '../lib/badges'
import ProgressCard from '../components/ProgressCard'
import './Statistics.css'

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return localDateStr()
}

function calcFocusScore(sessions, stats, settings) {
  const today = todayStr()
  const sessionsToday = sessions.find(s => s.date === today)?.count ?? 0
  const goalScore = Math.min(sessionsToday / (settings.dailyGoal || 1), 1) * 50
  const streakScore = Math.min(stats.currentStreak * 5, 30)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (7 - i))
    return localDateStr(d)
  })
  const activeDays = last7.filter(d => sessions.some(s => s.date === d && s.count > 0)).length
  return Math.round(goalScore + streakScore + (activeDays / 7) * 20)
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function formatUnlockDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function heatmapClass(count) {
  if (count === 0) return 'cell-0'
  if (count <= 2) return 'cell-low'
  if (count <= 4) return 'cell-mid'
  return 'cell-high'
}

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function MonthHeatmap({ sessions }) {
  const [monthOffset, setMonthOffset] = useState(0)

  const base = new Date()
  base.setDate(1)
  base.setMonth(base.getMonth() + monthOffset)
  const year = base.getFullYear()
  const month = base.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const monthLabel = base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const count = sessions.find(s => s.date === dateStr)?.count ?? 0
    cells.push({ day: d, dateStr, count })
  }

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-header">
        <span className="heatmap-month-label">{monthLabel}</span>
        <div className="heatmap-nav">
          <button className="nav-arrow" onClick={() => setMonthOffset(o => o - 1)}>‹</button>
          <button className="nav-arrow" onClick={() => setMonthOffset(o => o + 1)} disabled={monthOffset >= 0}>›</button>
        </div>
      </div>
      <div className="heatmap-dow-labels">
        {DOW_LABELS.map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <div className="heatmap-grid">
        {cells.map((cell, i) =>
          cell === null
            ? <div key={`pad-${i}`} className="heatmap-cell cell-empty" />
            : (
              <div
                key={cell.dateStr}
                className={`heatmap-cell ${heatmapClass(cell.count)}`}
                title={`${cell.dateStr}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`}
              >
                <span className="heatmap-day-num">{cell.day}</span>
              </div>
            )
        )}
      </div>
    </div>
  )
}

export default function Statistics() {
  const { badges, sessions, stats, settings } = useApp()

  const focusScore = calcFocusScore(sessions, stats, settings)
  const totalFocusMinutes = stats.totalSessions * settings.workMins
  const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="statistics-page">

      {/* Summary row */}
      <section className="stats-section">
        <div className="stats-summary">
          <div className="summary-card">
            <div className="summary-value">{stats.totalSessions}</div>
            <div className="summary-label">Total Sessions</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{stats.longestStreak}</div>
            <div className="summary-label">Longest Streak</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{focusScore}</div>
            <div className="summary-label">Focus Score</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{totalFocusMinutes}</div>
            <div className="summary-label">Focus Minutes</div>
          </div>
        </div>
      </section>

      {/* Weekly bar chart */}
      <section className="stats-section">
        <h3 className="stats-section-heading">This Week</h3>
        <ProgressCard />
      </section>

      {/* Monthly heatmap */}
      <section className="stats-section">
        <h3 className="stats-section-heading">This Month</h3>
        <div className="card heatmap-card">
          <MonthHeatmap sessions={sessions} />
        </div>
      </section>

      {/* Session history */}
      <section className="stats-section">
        <h3 className="stats-section-heading">Session History</h3>
        <div className="card history-card">
          {sortedSessions.length === 0 ? (
            <p className="history-empty">No sessions recorded yet.</p>
          ) : (
            <div className="history-list">
              {sortedSessions.map(s => {
                const goalPct = Math.min((s.count / (settings.dailyGoal || 1)) * 100, 100)
                return (
                  <div key={s.date} className="history-row">
                    <span className="history-date">{formatDate(s.date)}</span>
                    <div className="history-right">
                      <div className="history-goal-bar">
                        <div className="history-goal-fill" style={{ width: `${goalPct}%` }} />
                      </div>
                      <span className="history-count">
                        {s.count} {s.count === 1 ? 'session' : 'sessions'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Badges */}
      <section className="stats-section">
        <h3 className="stats-section-heading">Badges &amp; Achievements</h3>
        <p className="stats-sub"><strong>{badges.length}</strong> / {BADGE_DEFS.length} earned</p>
        <div className="badge-grid">
          {BADGE_DEFS.map(def => {
            const earned = badges.find(b => b.id === def.id)
            return (
              <div key={def.id} className={`badge-card ${earned ? 'earned' : 'locked'}`}>
                <span className="badge-icon">{def.icon}</span>
                <div className="badge-info">
                  <span className="badge-name">{def.name}</span>
                  <span className="badge-desc">{def.desc}</span>
                  {earned
                    ? <span className="badge-date">Unlocked {formatUnlockDate(earned.unlockedAt)}</span>
                    : <span className="badge-locked-label">Locked</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}

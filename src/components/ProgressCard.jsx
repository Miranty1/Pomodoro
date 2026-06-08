import { useState, useRef } from 'react'
import { useApp } from '../store/AppContext'
import './ProgressCard.css'

const DAY_ABBRS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return localDateStr()
}

function getCount(sessions, dateStr) {
  return sessions.find(s => s.date === dateStr)?.count ?? 0
}

function getWeekDays(offset = 0) {
  const today = new Date()
  const dow = today.getDay()
  const toMon = dow === 0 ? -6 : 1 - dow
  const mon = new Date(today)
  mon.setDate(today.getDate() + toMon + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

function getWeekLabel(days) {
  const first = days[0]
  const last = days[6]
  if (first.getMonth() === last.getMonth()) {
    return first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  return `${first.toLocaleString('en-US', { month: 'long' })} – ${last.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
}

function dayScore(count, dailyGoal) {
  return Math.round(Math.min(count / (dailyGoal || 1), 1) * 100)
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function ProgressCard() {
  const { sessions, settings } = useApp()
  const [weekOffset, setWeekOffset] = useState(0)
  const [tooltip, setTooltip] = useState(null)
  const cardRef = useRef(null)

  const today = todayStr()
  const weekDays = getWeekDays(weekOffset)
  const maxWeekCount = Math.max(
    ...weekDays.map(d => getCount(sessions, localDateStr(d))),
    settings.dailyGoal,
    1
  )

  function handleCellEnter(e, dateStr) {
    const count = getCount(sessions, dateStr)
    if (count === 0 && dateStr !== today) {
      setTooltip(null)
      return
    }
    const score = dayScore(count, settings.dailyGoal)
    const cellRect = e.currentTarget.getBoundingClientRect()
    const cardRect = cardRef.current.getBoundingClientRect()
    setTooltip({
      dateStr,
      count,
      score,
      top: cellRect.top - cardRect.top - 70,
      left: cellRect.left - cardRect.left + cellRect.width / 2,
    })
  }

  return (
    <div className="card progress-card" ref={cardRef}>
      {/* Header */}
      <div className="prog-header">
        <span className="prog-title">Progress</span>
        <div className="week-nav">
          <button className="nav-arrow" onClick={() => setWeekOffset(o => o - 1)}>‹</button>
          <span className="week-label">{getWeekLabel(weekDays)}</span>
          <button
            className="nav-arrow"
            onClick={() => setWeekOffset(o => o + 1)}
            disabled={weekOffset >= 0}
          >›</button>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="bar-chart">
        {weekDays.map((d, i) => {
          const ds = localDateStr(d)
          const count = getCount(sessions, ds)
          const pct = (count / maxWeekCount) * 100
          const isToday = ds === today
          const isFuture = ds > today
          return (
            <div
              key={ds}
              className="bar-col"
              onMouseEnter={e => !isFuture && handleCellEnter(e, ds)}
              onMouseLeave={() => setTooltip(null)}
            >
              <div className="bar-track">
                {!isFuture && count > 0 && (
                  <div
                    key={`${ds}-${weekOffset}`}
                    className="bar-fill bar-fill--animate"
                    style={{
                      height: `${pct}%`,
                      background: isToday ? 'var(--accent)' : '#555',
                      animationDelay: `${i * 40}ms`,
                    }}
                  />
                )}
              </div>
              <span className="bar-label">{DAY_ABBRS[i]}</span>
              <span className="bar-date">{d.getDate()}</span>
            </div>
          )
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="prog-tooltip"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          <div className="tip-date">{formatDate(tooltip.dateStr)}</div>
          <div className="tip-stat">{tooltip.count} sessions</div>
          <div className="tip-stat">{tooltip.score}% of goal</div>
        </div>
      )}
    </div>
  )
}

import { useApp } from '../store/AppContext'
import { BADGE_DEFS } from '../lib/badges'
import './Statistics.css'

function formatUnlockDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function Statistics() {
  const { badges } = useApp()

  return (
    <div className="statistics-page">
      <h2 className="stats-heading">Badges &amp; Achievements</h2>
      <p className="stats-sub">{badges.length} / {BADGE_DEFS.length} earned</p>
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
    </div>
  )
}

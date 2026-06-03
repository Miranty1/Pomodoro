import { useEffect } from 'react'
import { useApp } from '../store/AppContext'
import { BADGE_DEFS } from '../lib/badges'
import './BadgeToast.css'

export default function BadgeToast() {
  const { badgeToasts, setBadgeToasts } = useApp()

  const currentId = badgeToasts[0] ?? null

  useEffect(() => {
    if (!currentId) return
    const timer = setTimeout(() => {
      setBadgeToasts(prev => prev.slice(1))
    }, 4000)
    return () => clearTimeout(timer)
  }, [currentId])

  if (!currentId) return null
  const def = BADGE_DEFS.find(d => d.id === currentId)
  if (!def) return null

  return (
    <div className="badge-toast" key={currentId}>
      <span className="toast-icon">{def.icon}</span>
      <div className="toast-body">
        <div className="toast-title">Badge Unlocked!</div>
        <div className="toast-name">{def.name}</div>
        <div className="toast-desc">{def.desc}</div>
      </div>
    </div>
  )
}

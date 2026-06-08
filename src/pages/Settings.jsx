import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext'
import { useAuth } from '../store/AuthContext'
import { hasStoredToken, clearTokens, getValidToken } from '../lib/spotify'
import './Settings.css'

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID

function formatHour(h) {
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function Stepper({ value, min, max, format, onChange }) {
  const display = format ? format(value) : value
  return (
    <div className="stepper" role="group">
      <button
        className="stepper-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease"
        tabIndex={0}
      >−</button>
      <span className="stepper-value">{display}</span>
      <button
        className="stepper-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase"
        tabIndex={0}
      >+</button>
    </div>
  )
}

function Toggle({ id, checked, onChange }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      className={`toggle-switch${checked ? ' toggle-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

export default function Settings() {
  const { settings, setSettings } = useApp()
  const { signOut } = useAuth()
  const [spotifyConnected, setSpotifyConnected] = useState(hasStoredToken())
  const [spotifyName, setSpotifyName]           = useState(null)

  useEffect(() => {
    if (!spotifyConnected || !CLIENT_ID) return
    getValidToken(CLIENT_ID).then(token => {
      if (!token) { setSpotifyConnected(false); return }
      fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.display_name) setSpotifyName(d.display_name) })
        .catch(() => {})
    })
  }, [spotifyConnected])

  function set(name, value) {
    setSettings(prev => ({ ...prev, [name]: value }))
  }

  function handleDisconnect() {
    clearTokens()
    setSpotifyConnected(false)
    setSpotifyName(null)
  }

  async function handleNotifToggle(next) {
    if (next) {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
    }
    set('notifications', next)
  }

  const notifOn = settings.notifications ?? false

  return (
    <div className="settings-page">
      <h2 className="settings-heading">Settings</h2>

      {/* ── Timer ──────────────────────────────────────────── */}
      <section className="settings-section">
        <header className="settings-section-label">Timer</header>

        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Focus session</div>
            <div className="settings-row-desc">Minutes per Pomodoro block</div>
          </div>
          <Stepper value={settings.workMins} min={1} max={120}
            onChange={v => set('workMins', v)} />
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Short break</div>
            <div className="settings-row-desc">Rest between sessions</div>
          </div>
          <Stepper value={settings.breakMins} min={1} max={60}
            onChange={v => set('breakMins', v)} />
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Long break</div>
            <div className="settings-row-desc">Extended rest after 4 sessions</div>
          </div>
          <Stepper value={settings.longBreakMins} min={1} max={60}
            onChange={v => set('longBreakMins', v)} />
        </div>
      </section>

      {/* ── Goals ──────────────────────────────────────────── */}
      <section className="settings-section">
        <header className="settings-section-label">Goals</header>

        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Daily target</div>
            <div className="settings-row-desc">Sessions to complete per day</div>
          </div>
          <Stepper value={settings.dailyGoal} min={1} max={20}
            onChange={v => set('dailyGoal', v)} />
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Focus window opens</div>
            <div className="settings-row-desc">Earliest start time for a session</div>
          </div>
          <Stepper value={settings.startHour} min={0} max={settings.endHour - 1}
            format={formatHour} onChange={v => set('startHour', v)} />
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Focus window closes</div>
            <div className="settings-row-desc">Latest end time for a session</div>
          </div>
          <Stepper value={settings.endHour} min={settings.startHour + 1} max={23}
            format={formatHour} onChange={v => set('endHour', v)} />
        </div>
      </section>

      {/* ── Spotify ────────────────────────────────────────── */}
      <section className="settings-section">
        <header className="settings-section-label">Spotify</header>

        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">
              {spotifyConnected && spotifyName ? spotifyName : 'Music'}
            </div>
            <div className="settings-row-desc">
              {spotifyConnected
                ? 'Connected via Spotify'
                : 'Not connected — link from the Music card on the timer'}
            </div>
          </div>
          {spotifyConnected && (
            <button className="settings-btn-ghost" onClick={handleDisconnect}>
              Disconnect
            </button>
          )}
        </div>
      </section>

      {/* ── Notifications ──────────────────────────────────── */}
      <section className="settings-section">
        <header className="settings-section-label">Notifications</header>

        <div className="settings-row">
          <label htmlFor="notif-toggle" className="settings-row-text settings-row-clickable">
            <div className="settings-row-label">Session alerts</div>
            <div className="settings-row-desc">
              Browser notification when a focus session ends
            </div>
          </label>
          <Toggle id="notif-toggle" checked={notifOn} onChange={handleNotifToggle} />
        </div>
      </section>

      {/* ── Account ────────────────────────────────────────── */}
      <section className="settings-section">
        <header className="settings-section-label">Account</header>

        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Sign out</div>
            <div className="settings-row-desc">You will be redirected to the login page</div>
          </div>
          <button className="settings-btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </section>
    </div>
  )
}

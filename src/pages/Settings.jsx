import { useApp } from '../store/AppContext'

function Settings() {
  const { settings, setSettings } = useApp()

  function handleChange(e) {
    const { name, value } = e.target
    setSettings((prev) => ({ ...prev, [name]: Number(value) }))
  }

  const fields = [
    { name: 'workMins', label: 'Work (minutes)' },
    { name: 'breakMins', label: 'Short break (minutes)' },
    { name: 'longBreakMins', label: 'Long break (minutes)' },
    { name: 'dailyGoal', label: 'Daily goal (sessions)' },
    { name: 'startHour', label: 'Start hour' },
    { name: 'endHour', label: 'End hour' },
  ]

  return (
    <div className="card" style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontWeight: 600 }}>Settings</h2>
      {fields.map(({ name, label }) => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{label}</label>
          <input
            type="number"
            name={name}
            value={settings[name]}
            onChange={handleChange}
            min={1}
            style={inputStyle}
          />
        </div>
      ))}
    </div>
  )
}

const inputStyle = {
  background: 'var(--bg-page)',
  border: '1px solid #333',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '15px',
  padding: '8px 12px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  width: '100%',
}

export default Settings

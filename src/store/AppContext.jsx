import { createContext, useContext } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'

const AppContext = createContext(null)

const DEFAULT_SETTINGS = {
  workMins: 25,
  breakMins: 5,
  longBreakMins: 15,
  dailyGoal: 8,
  startHour: 6,
  endHour: 22,
}

const DEFAULT_STATS = {
  totalSessions: 0,
  currentStreak: 0,
  longestStreak: 0,
}

export function AppProvider({ children }) {
  const [tasks, setTasks] = useLocalStorage('tasks', [])
  const [sessions, setSessions] = useLocalStorage('sessions', [])
  const [calendarDays, setCalendarDays] = useLocalStorage('calendarDays', {})
  const [badges, setBadges] = useLocalStorage('badges', [])
  const [stats, setStats] = useLocalStorage('stats', DEFAULT_STATS)
  const [settings, setSettings] = useLocalStorage('settings', DEFAULT_SETTINGS)

  return (
    <AppContext.Provider value={{
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

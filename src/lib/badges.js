export const BADGE_DEFS = [
  { id: 'first_step',    icon: '🎯', name: 'First Step',    desc: 'Complete your first Pomodoro' },
  { id: 'on_a_roll',     icon: '🔥', name: 'On a Roll',     desc: 'Reach a 3-day streak' },
  { id: 'deep_worker',   icon: '⚡', name: 'Deep Worker',   desc: 'Complete 5 sessions in one day' },
  { id: 'century',       icon: '💯', name: 'Century',       desc: 'Complete 100 total sessions' },
  { id: 'perfectionist', icon: '✨', name: 'Perfectionist', desc: 'Hit daily goal 7 days in a row' },
  { id: 'early_bird',    icon: '🌅', name: 'Early Bird',    desc: 'Start a session before 8am' },
  { id: 'night_owl',     icon: '🦉', name: 'Night Owl',     desc: 'Complete a session after 9pm' },
]

function checkPerfectionist(sessions, dailyGoal) {
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    const entry = sessions.find(s => s.date === ds)
    if (!entry || entry.count < (dailyGoal || 1)) return false
  }
  return true
}

export function checkBadges({ newSessions, newStats, settings, badges, startHour, completeHour }) {
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = newSessions.find(s => s.date === today)?.count ?? 0

  const conditions = {
    first_step:    newStats.totalSessions >= 1,
    on_a_roll:     newStats.currentStreak >= 3,
    deep_worker:   todayCount >= 5,
    century:       newStats.totalSessions >= 100,
    perfectionist: checkPerfectionist(newSessions, settings.dailyGoal),
    early_bird:    startHour < 8,
    night_owl:     completeHour >= 21,
  }

  const newlyUnlocked = []
  const newBadges = [...badges]

  for (const [id, met] of Object.entries(conditions)) {
    if (met && !badges.some(b => b.id === id)) {
      newBadges.push({ id, unlockedAt: new Date().toISOString() })
      newlyUnlocked.push(id)
    }
  }

  return { newBadges, newlyUnlocked }
}

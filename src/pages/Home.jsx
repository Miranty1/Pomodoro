import './Home.css'

function PlaceholderCard({ title, style }) {
  return (
    <div className="card placeholder-card" style={style}>
      <span className="placeholder-label">{title}</span>
    </div>
  )
}

function Home() {
  return (
    <div className="home-grid">
      <PlaceholderCard title="Timer" style={{ gridArea: 'timer' }} />
      <PlaceholderCard title="Calendar" style={{ gridArea: 'calendar' }} />
      <PlaceholderCard title="Progress Report" style={{ gridArea: 'progress' }} />
      <PlaceholderCard title="Music" style={{ gridArea: 'music' }} />
      <PlaceholderCard title="Tasks" style={{ gridArea: 'tasks' }} />
    </div>
  )
}

export default Home

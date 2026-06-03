import './Home.css'
import PomodoroTimer from '../components/PomodoroTimer'
import TaskList from '../components/TaskList'
import ProgressCard from '../components/ProgressCard'

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
      <PomodoroTimer />
      <TaskList />
      <PlaceholderCard title="Music" style={{ gridArea: 'music' }} />
      <ProgressCard />
    </div>
  )
}

export default Home

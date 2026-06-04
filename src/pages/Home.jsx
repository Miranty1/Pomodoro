import './Home.css'
import PomodoroTimer from '../components/PomodoroTimer'
import TaskList from '../components/TaskList'
import ProgressCard from '../components/ProgressCard'
import MusicCard from '../components/MusicCard'

function Home() {
  return (
    <div className="home-grid">
      <PomodoroTimer />
      <TaskList />
      <MusicCard />
      <ProgressCard />
    </div>
  )
}

export default Home

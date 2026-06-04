import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Statistics from './pages/Statistics'
import Settings from './pages/Settings'
import BadgeToast from './components/BadgeToast'
import SpotifyCallback from './pages/SpotifyCallback'

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar />
      <main style={{ flex: 1, padding: '20px 24px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/callback" element={<SpotifyCallback />} />
        </Routes>
      </main>
      <BadgeToast />
    </div>
  )
}

export default App

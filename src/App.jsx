import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from './store/AuthContext'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Statistics from './pages/Statistics'
import Settings from './pages/Settings'
import Login from './pages/Login'
import BadgeToast from './components/BadgeToast'
import SpotifyCallback from './pages/SpotifyCallback'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/callback" element={<SpotifyCallback />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <NavBar />
              <main style={{ flex: 1, padding: '20px 24px' }}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
              <BadgeToast />
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeCode, storeTokens } from '../lib/spotify'

export default function SpotifyCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handle() {
      const params = new URLSearchParams(window.location.search)
      const code  = params.get('code')
      const error = params.get('error')

      if (error || !code) {
        navigate('/')
        return
      }

      const verifier   = sessionStorage.getItem('spotify_code_verifier')
      const clientId   = import.meta.env.VITE_SPOTIFY_CLIENT_ID
      const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI

      try {
        const tokens = await exchangeCode(code, verifier, clientId, redirectUri)
        storeTokens(tokens)
      } catch (e) {
        console.error('Spotify auth failed:', e)
      } finally {
        sessionStorage.removeItem('spotify_code_verifier')
        navigate('/')
      }
    }
    handle()
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', color: 'var(--text-secondary)', fontSize: '14px',
    }}>
      Connecting to Spotify…
    </div>
  )
}

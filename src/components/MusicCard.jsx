import { useState, useEffect, useCallback } from 'react'
import {
  generateCodeVerifier, generateCodeChallenge, buildAuthUrl,
  getValidToken, clearTokens, hasStoredToken,
  getPlaybackState, play, pause, next, previous, setShuffle, setRepeat,
  msToTime,
} from '../lib/spotify'
import './MusicCard.css'

const CLIENT_ID   = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI

const REPEAT_CYCLE = { off: 'context', context: 'track', track: 'off' }

export default function MusicCard() {
  const [connected, setConnected] = useState(hasStoredToken)
  const [playback,  setPlayback]  = useState(null)
  const [status,    setStatus]    = useState(null)  // 'no_device' | 'not_premium' | 'error'
  const [pending,   setPending]   = useState(false)

  // ── Fetch current playback state ──────────────────────────────────────────

  const fetchPlayback = useCallback(async () => {
    const token = await getValidToken(CLIENT_ID)
    if (!token) { setConnected(false); return }

    let res
    try {
      res = await getPlaybackState(token)
    } catch {
      setStatus('error')
      return
    }

    if (res.status === 401) { clearTokens(); setConnected(false); return }
    if (res.status === 204 || !res.data) { setStatus('no_device'); setPlayback(null); return }
    if (res.status !== 200) { setStatus('error'); return }

    setStatus(null)
    setPlayback(res.data)
  }, [])

  // ── Poll every 5 seconds while connected ─────────────────────────────────

  useEffect(() => {
    if (!connected) return
    fetchPlayback()
    const id = setInterval(fetchPlayback, 5000)
    return () => clearInterval(id)
  }, [connected, fetchPlayback])

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function handleConnect() {
    const verifier  = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    sessionStorage.setItem('spotify_code_verifier', verifier)
    console.log('[Spotify] redirect_uri being sent:', JSON.stringify(REDIRECT_URI))
    window.location.href = buildAuthUrl(CLIENT_ID, REDIRECT_URI, challenge)
  }

  function handleDisconnect() {
    clearTokens()
    setConnected(false)
    setPlayback(null)
    setStatus(null)
  }

  // ── Playback control ──────────────────────────────────────────────────────

  async function handleAction(actionFn) {
    if (pending) return
    setPending(true)
    try {
      const token = await getValidToken(CLIENT_ID)
      if (!token) { setConnected(false); return }

      const { status: s } = await actionFn(token)
      if (s === 403) { setStatus('not_premium'); return }
      if (s === 404) { setStatus('no_device'); return }

      // Re-fetch after a short delay to get updated state
      await new Promise(r => setTimeout(r, 300))
      await fetchPlayback()
    } catch {
      setStatus('error')
    } finally {
      setPending(false)
    }
  }

  function handlePlayPause() {
    if (!playback) return
    handleAction(playback.is_playing ? pause : play)
  }

  function handleShuffle() {
    if (!playback) return
    handleAction(t => setShuffle(t, !playback.shuffle_state))
  }

  function handleRepeat() {
    if (!playback) return
    const nextState = REPEAT_CYCLE[playback.repeat_state] ?? 'off'
    handleAction(t => setRepeat(t, nextState))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const art = playback?.item?.album?.images?.[0]?.url  // 640px full-res
  const progressPct = playback?.item
    ? (playback.progress_ms / playback.item.duration_ms) * 100
    : 0

  return (
    <div className="card music-card">
      <div className="music-header">
        <span className="music-title">Music</span>
        {connected && (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            Disconnect
          </button>
        )}
      </div>

      {/* Not connected */}
      {!connected && (
        <div className="spotify-connect">
          <span className="spotify-logo">♫</span>
          <button className="btn-connect" onClick={handleConnect}
            disabled={!CLIENT_ID}>
            Connect Spotify
          </button>
          {!CLIENT_ID && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Set VITE_SPOTIFY_CLIENT_ID in .env
            </span>
          )}
        </div>
      )}

      {/* Connected — status messages */}
      {connected && status === 'no_device' && (
        <div className="music-status">
          Open Spotify on your computer to connect
        </div>
      )}

      {connected && status === 'not_premium' && (
        <div className="music-status">
          Spotify Premium required for playback control
        </div>
      )}

      {connected && status === 'error' && (
        <div className="music-status">
          Could not reach Spotify — check your connection
        </div>
      )}

      {/* Connected — now playing */}
      {connected && !status && playback?.item && (
        <div className="music-player">
          <div className="music-player-left">
            <div className="album-art-wrap">
              {art
                ? <img className="album-art" src={art} alt="album art" />
                : <div className="album-art-placeholder">♫</div>
              }
            </div>
          </div>

          <div className="music-player-right">
            <div className="track-info">
              <div className="track-name">{playback.item.name}</div>
              <div className="artist-name">
                {playback.item.artists?.map(a => a.name).join(', ')}
              </div>
            </div>

            <div className="controls">
              <button
                className={`ctrl-btn${playback.shuffle_state ? ' active' : ''}`}
                onClick={handleShuffle}
                disabled={pending}
                title="Shuffle"
              >⇄</button>

              <button
                className="ctrl-btn"
                onClick={() => handleAction(previous)}
                disabled={pending}
                title="Previous"
              >⏮</button>

              <button
                className="ctrl-btn play-btn"
                onClick={handlePlayPause}
                disabled={pending}
                title={playback.is_playing ? 'Pause' : 'Play'}
              >
                {playback.is_playing ? '⏸' : '▶'}
              </button>

              <button
                className="ctrl-btn"
                onClick={() => handleAction(next)}
                disabled={pending}
                title="Next"
              >⏭</button>

              <button
                className={`ctrl-btn${playback.repeat_state !== 'off' ? ' active' : ''}`}
                onClick={handleRepeat}
                disabled={pending}
                title={`Repeat: ${playback.repeat_state}`}
              >
                {playback.repeat_state === 'track' ? '🔂' : '↻'}
              </button>
            </div>
          </div>

          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="progress-times">
              <span>{msToTime(playback.progress_ms)}</span>
              <span>{msToTime(playback.item.duration_ms)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

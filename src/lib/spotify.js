// ─── PKCE helpers ────────────────────────────────────────────────────────────

export function generateCodeVerifier() {
  const arr = new Uint8Array(32)
  window.crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ─── Auth URL ─────────────────────────────────────────────────────────────────

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ')

export function buildAuthUrl(clientId, redirectUri, codeChallenge) {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  })
  return `https://accounts.spotify.com/authorize?${params}`
}

// ─── Token exchange & refresh ─────────────────────────────────────────────────

export async function exchangeCode(code, verifier, clientId, redirectUri) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) throw new Error('Token exchange failed')
  return res.json()
}

export async function refreshAccessToken(refreshToken, clientId) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  return res.json()
}

// ─── Token storage ────────────────────────────────────────────────────────────

export function storeTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem('spotify_access_token', access_token)
  if (refresh_token) localStorage.setItem('spotify_refresh_token', refresh_token)
  localStorage.setItem('spotify_token_expiry', String(Date.now() + expires_in * 1000))
}

export function clearTokens() {
  ['spotify_access_token', 'spotify_refresh_token', 'spotify_token_expiry']
    .forEach(k => localStorage.removeItem(k))
}

export function hasStoredToken() {
  return !!localStorage.getItem('spotify_access_token')
}

export async function getValidToken(clientId) {
  const token   = localStorage.getItem('spotify_access_token')
  const expiry  = Number(localStorage.getItem('spotify_token_expiry'))
  const refresh = localStorage.getItem('spotify_refresh_token')

  if (!token) return null

  if (Date.now() >= expiry - 5 * 60 * 1000) {
    try {
      const data = await refreshAccessToken(refresh, clientId)
      storeTokens(data)
      return data.access_token
    } catch {
      clearTokens()
      return null
    }
  }
  return token
}

// ─── Playback API calls ───────────────────────────────────────────────────────

async function spotifyFetch(method, path, token, body) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, data }
}

export const getPlaybackState = (token) => spotifyFetch('GET', '/me/player', token)
export const play             = (token) => spotifyFetch('PUT', '/me/player/play', token)
export const pause            = (token) => spotifyFetch('PUT', '/me/player/pause', token)
export const next             = (token) => spotifyFetch('POST', '/me/player/next', token)
export const previous         = (token) => spotifyFetch('POST', '/me/player/previous', token)
export const setShuffle = (token, state) =>
  spotifyFetch('PUT', `/me/player/shuffle?state=${state}`, token)
export const setRepeat  = (token, state) =>
  spotifyFetch('PUT', `/me/player/repeat?state=${state}`, token)

// ─── Time formatter ───────────────────────────────────────────────────────────

export function msToTime(ms) {
  if (!ms) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

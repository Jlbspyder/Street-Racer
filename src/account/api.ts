import { create } from 'zustand'

export type AccountUser = { id: string; email: string; username: string }
export type CarOption = { id: string; key: string; name: string; topSpeed: number; acceleration: number; handling: number; owned: boolean; unlockType: string | null; unlockRequirement: number | null }
export type PlayerStats = { totalRuns: number; totalScore: number; totalDistance: number; bestScore: number; longestDistance: number; highestSpeed: number; rewardPoints: number }
export type SavedRun = { id: string; score: number; distance: number; maxSpeed: number; isValid: boolean; validationReason: string | null; createdAt: string }
export type DailyChallenge = { title: string; description: string; reward: number; completed: boolean }
export type RunResult = { run: SavedRun; personalBest: boolean; duplicate: boolean; newUnlocks: CarOption[]; completedChallenges: DailyChallenge[] }
export type Board = { metric: string; entries: { rank: number; username: string; value: number }[] }
export type Page<T> = { data: T[]; pagination: { page: number; pages: number; total: number } }

function savedToken() {
  try { return sessionStorage.getItem('street-racer-token') ?? '' } catch { return '' }
}
export const useAccount = create<{ token: string; user: AccountUser | null }>(() => ({ token: savedToken(), user: null }))

export function setSession(token: string, user: AccountUser | null) {
  try {
    if (token) sessionStorage.setItem('street-racer-token', token)
    else sessionStorage.removeItem('street-racer-token')
  } catch { /* Session storage is optional. */ }
  useAccount.setState({ token, user })
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const token = useAccount.getState().token
  const base = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    })
  } catch { throw new Error('Cannot reach the server. You can keep playing and retry saving later.') }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') setSession('', null)
    throw new Error(Array.isArray(data?.message) ? data.message.join(' ') : data?.message ?? 'The request failed. Please try again.')
  }
  return data as T
}

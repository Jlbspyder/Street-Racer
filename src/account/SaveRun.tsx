import { useState } from 'react'
import { api, useAccount } from './api'
import type { RunResult } from './api'
import { useGame } from '../game/store'

export function SaveRun({ openAccount }: { openAccount: () => void }) {
  const game = useGame()
  const token = useAccount(state => state.token)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RunResult | null>(null)

  async function save() {
    setBusy(true); setError('')
    try {
      setResult(await api<RunResult>('/runs', {
        submissionId: game.submissionId, score: game.score, distance: game.distance,
        duration: game.duration, maxSpeed: game.maxSpeed, boostsUsed: game.boostsUsed,
        collisions: game.impacts, ...(game.runCar ? { selectedCarId: game.runCar.id } : {}),
      }))
    } catch (error) { setError(error instanceof Error ? error.message : 'Save failed. Please retry.') }
    finally { setBusy(false) }
  }

  return <div className="save-run">
    <p>{game.score.toLocaleString()} points · {(game.distance / 1000).toFixed(2)} km · {Math.round(game.maxSpeed)} km/h peak</p>
    {error && <p role="alert">{error}</p>}
    {result ? <p role="status">{result.run.isValid ? 'Run saved.' : `Saved but not ranked: ${result.run.validationReason}.`}
      {result.personalBest && ' New personal best!'}
      {result.newUnlocks.map(car => ` Unlocked ${car.name}.`).join('')}
      {result.completedChallenges.map(challenge => ` Completed ${challenge.title}.`).join('')}
    </p> : game.duration < 0.1 ? <p>Drive before saving a run.</p> : token ? <button className="quiet" disabled={busy} onClick={save}>{busy ? 'SAVING...' : 'SAVE RUN TO ACCOUNT'}</button> : <button className="quiet" onClick={openAccount}>LOG IN TO SAVE THIS RUN</button>}
  </div>
}

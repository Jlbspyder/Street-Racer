import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carUnlocked, challengeMet, validateRun } from '../src/rules'

const run = { score: 10000, distance: 1000, duration: 60, maxSpeed: 150, collisions: 0 }
const car = { topSpeed: 201.6 }

test('score and average speed are recalculated from metres and seconds', () => {
  const result = validateRun(run, car)
  assert.equal(result.score, 10000)
  assert.equal(result.reason, null)
  assert.ok(Math.abs(result.averageSpeed - 60) < 0.000001)
  assert.equal(validateRun({ ...run, score: 999999 }, car).reason, 'SCORE_MISMATCH')
})

test('impossible speeds, distances and averages cannot progress', () => {
  assert.equal(validateRun({ ...run, maxSpeed: 950 }, car).reason, 'IMPOSSIBLE_MAX_SPEED')
  assert.equal(validateRun({ ...run, duration: 3 }, car).reason, 'IMPOSSIBLE_DISTANCE')
  assert.equal(validateRun({ ...run, averageSpeed: 120 }, car).reason, 'INVALID_AVERAGE_SPEED')
  assert.equal(validateRun({ ...run, collisions: 1000 }, car).reason, 'IMPOSSIBLE_COLLISIONS')
  assert.equal(validateRun({ ...run, maxSpeed: 273.6 }, car).reason, null)
})

test('challenge completion uses the actual run metrics', () => {
  assert.equal(challengeMet('distance_without_collision', 1000, run), true)
  assert.equal(challengeMet('distance_without_collision', 1000, { ...run, collisions: 1 }), false)
  assert.equal(challengeMet('score', 20000, run), false)
  assert.equal(challengeMet('unknown', 0, run), false)
})

test('car progression requires meeting its server-defined threshold', () => {
  const profile = { totalDistance: 50000, bestScore: 100000, highestSpeed: 220, totalRuns: 25 }
  const base = { isDefault: false, unlockRequirement: 50000, unlockType: 'distance' }
  assert.equal(carUnlocked(base, profile, 0), true)
  assert.equal(carUnlocked({ ...base, unlockRequirement: 50001 }, profile, 0), false)
  assert.equal(carUnlocked({ ...base, unlockType: 'challenges', unlockRequirement: 5 }, profile, 4), false)
  assert.equal(carUnlocked({ ...base, unlockType: 'challenges', unlockRequirement: 5 }, profile, 5), true)
})


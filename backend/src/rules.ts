import type { Car, PlayerProfile, Run } from './generated/prisma/client'

export function validateRun(run: { score: number; distance: number; duration: number; maxSpeed: number; averageSpeed?: number; collisions: number }, car: Pick<Car, 'topSpeed'>) {
  const score = Math.floor(run.distance * 10)
  const averageSpeed = run.distance / run.duration * 3.6
  if (run.maxSpeed > car.topSpeed + 72 + 2) return { score, averageSpeed, reason: 'IMPOSSIBLE_MAX_SPEED' }
  if (run.distance > run.maxSpeed / 3.6 * run.duration + 2) return { score, averageSpeed, reason: 'IMPOSSIBLE_DISTANCE' }
  if (run.averageSpeed !== undefined && Math.abs(run.averageSpeed - averageSpeed) > 2) return { score, averageSpeed, reason: 'INVALID_AVERAGE_SPEED' }
  if (run.score !== score) return { score, averageSpeed, reason: 'SCORE_MISMATCH' }
  if (run.collisions > Math.ceil(run.duration / 0.65) + 2) return { score, averageSpeed, reason: 'IMPOSSIBLE_COLLISIONS' }
  return { score, averageSpeed, reason: null }
}

export function challengeMet(metric: string, target: number, run: Pick<Run, 'distance' | 'collisions' | 'score' | 'maxSpeed'>) {
  if (metric === 'distance_without_collision') return run.collisions === 0 && run.distance >= target
  if (metric === 'distance') return run.distance >= target
  if (metric === 'score') return run.score >= target
  if (metric === 'speed') return run.maxSpeed >= target
  return false
}

export function carUnlocked(car: Pick<Car, 'isDefault' | 'unlockType' | 'unlockRequirement'>, profile: Pick<PlayerProfile, 'totalDistance' | 'bestScore' | 'highestSpeed' | 'totalRuns'>, completions: number) {
  if (car.isDefault) return true
  const target = car.unlockRequirement
  if (target === null) return false
  if (car.unlockType === 'distance') return profile.totalDistance >= target
  if (car.unlockType === 'score') return profile.bestScore >= target
  if (car.unlockType === 'speed') return profile.highestSpeed >= target
  if (car.unlockType === 'runs') return profile.totalRuns >= target
  if (car.unlockType === 'challenges') return completions >= target
  return false
}

export function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, pages: Math.ceil(total / limit) }
}

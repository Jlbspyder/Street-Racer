import type { OpenAPIObject } from '@nestjs/swagger'

export function documentResponses(document: OpenAPIObject) {
  const user = { id: 'user-uuid', email: 'player@example.com', username: 'streetking', createdAt: '2026-10-10T12:00:00.000Z' }
  const stats = { totalRuns: 1, totalScore: 10000, totalDistance: 1000, bestScore: 10000, longestDistance: 1000, highestSpeed: 150, rewardPoints: 0 }
  const run = { id: 'run-uuid', userId: 'user-uuid', submissionId: 'client-uuid', score: 10000, distance: 1000, duration: 60, maxSpeed: 150, averageSpeed: 60, collisions: 0, boostsUsed: 0, nearMisses: 0, selectedCarId: 'car-uuid', isValid: true, validationReason: null, createdAt: user.createdAt }
  const car = { id: 'car-uuid', key: 'starter', name: 'Street One', topSpeed: 201.6, acceleration: 19, handling: 8, isDefault: true, unlockType: null, unlockRequirement: null, owned: true }
  const challenge = { id: 'challenge-uuid', key: '2026-10-10', title: 'Clean Run', description: 'Drive 10 km in one run without a collision.', metric: 'distance_without_collision', target: 10000, reward: 2000, startsAt: '2026-10-10T00:00:00.000Z', endsAt: '2026-10-11T00:00:00.000Z', completed: false }
  const pagination = { page: 1, limit: 20, total: 1, pages: 1 }
  const examples: Record<string, unknown> = {
    '/health': { status: 'ok', database: 'connected' },
    '/auth/register': { user, accessToken: 'JWT_ACCESS_TOKEN' },
    '/auth/login': { user, accessToken: 'JWT_ACCESS_TOKEN' },
    '/users/me': user, '/users/me/stats': stats,
    '/runs': { run, personalBest: true, newUnlocks: [], completedChallenges: [], duplicate: false },
    '/runs/me': { data: [run], pagination }, '/runs/{id}': run,
    '/cars': [car], '/cars/me': [{ id: 'ownership-uuid', carId: car.id, userId: user.id, unlockedAt: user.createdAt, car }],
    '/challenges/daily': challenge,
    '/challenges/history': { data: [{ id: 'completion-uuid', challengeId: challenge.id, userId: user.id, runId: run.id, completedAt: user.createdAt, challenge }], pagination },
    '/leaderboard': { metric: 'score', entries: [{ rank: 1, username: 'streetking', value: 10000 }], pagination },
    '/leaderboard/me': { metric: 'score', rank: 1, value: 10000 },
  }
  for (const [path, methods] of Object.entries(document.paths)) {
    for (const method of ['get', 'post'] as const) {
      const operation = methods?.[method]
      if (!operation) continue
      operation.responses[method === 'post' ? '201' : '200'] = { description: 'Success', content: { 'application/json': { example: examples[path] } } }
      for (const status of [400, 401, 403, 404, 409, 429, 500]) {
        operation.responses[status] = { description: 'Consistent API error', content: { 'application/json': { example: { statusCode: status, error: 'Request failed', code: status === 401 ? 'UNAUTHORIZED' : 'INVALID_REQUEST', message: 'Human-readable explanation' } } } }
      }
    }
  }
}

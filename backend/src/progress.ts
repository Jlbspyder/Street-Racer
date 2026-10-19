import { Injectable, Logger } from '@nestjs/common'
import { Database } from './database'
import type { Prisma, Run } from './generated/prisma/client'
import { carUnlocked, challengeMet } from './rules'

@Injectable()
export class ProgressService {
  private readonly logger = new Logger('Progress')
  constructor(private readonly db: Database) {}

  async daily(database: Prisma.TransactionClient = this.db, now = new Date()) {
    const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const endsAt = new Date(startsAt.getTime() + 86400000)
    const templates = [
      { title: 'Clean Run', description: 'Drive 10 km in one run without a collision.', metric: 'distance_without_collision', target: 10000, reward: 2000 },
      { title: 'City Explorer', description: 'Drive 5 km in one run.', metric: 'distance', target: 5000, reward: 1000 },
      { title: 'Point Chaser', description: 'Score 50,000 points in one run.', metric: 'score', target: 50000, reward: 1000 },
    ]
    const template = templates[Math.floor(startsAt.getTime() / 86400000) % templates.length]
    return database.dailyChallenge.upsert({
      where: { key: startsAt.toISOString().slice(0, 10) },
      update: {},
      create: { key: startsAt.toISOString().slice(0, 10), startsAt, endsAt, ...template },
    })
  }

  async apply(tx: Prisma.TransactionClient, run: Run) {
    const challenge = await this.daily(tx, run.createdAt)
    const completedChallenges = []
    if (run.createdAt >= challenge.startsAt && run.createdAt < challenge.endsAt && challengeMet(challenge.metric, challenge.target, run)) {
      const existing = await tx.challengeCompletion.findUnique({ where: { challengeId_userId: { challengeId: challenge.id, userId: run.userId } } })
      if (!existing) {
        await tx.challengeCompletion.create({ data: { challengeId: challenge.id, userId: run.userId, runId: run.id } })
        await tx.playerProfile.update({ where: { userId: run.userId }, data: { rewardPoints: { increment: challenge.reward } } })
        completedChallenges.push(challenge)
      }
    }
    const profile = await tx.playerProfile.findUniqueOrThrow({ where: { userId: run.userId } })
    const completions = await tx.challengeCompletion.count({ where: { userId: run.userId } })
    const cars = await tx.car.findMany({ where: { players: { none: { userId: run.userId } } } })
    const newUnlocks = []
    for (const car of cars) {
      if (!carUnlocked(car, profile, completions)) continue
      await tx.playerCar.create({ data: { userId: run.userId, carId: car.id } })
      newUnlocks.push(car)
      this.logger.log(`Car unlocked: ${car.key}`)
    }
    return { newUnlocks, completedChallenges }
  }
}

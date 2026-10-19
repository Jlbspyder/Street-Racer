import { Body, Controller, Get, Injectable, Logger, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { randomUUID } from 'node:crypto'
import { AuthGuard } from './auth'
import type { PlayerRequest } from './auth'
import { Database } from './database'
import { RunDto, RunsQuery } from './dto'
import { fail } from './errors'
import { ProgressService } from './progress'
import { pagination, validateRun } from './rules'

@Injectable()
export class RunsService {
  private readonly logger = new Logger('Runs')
  constructor(private readonly db: Database, private readonly progress: ProgressService) {}

  async submit(userId: string, dto: RunDto) {
    const submissionId = dto.submissionId ?? randomUUID()
    return this.db.$transaction(async tx => {
      // Serialize this player's submissions: stats, rewards and unlocks change together.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
      const existing = await tx.run.findUnique({ where: { userId_submissionId: { userId, submissionId } } })
      if (existing) return { run: existing, personalBest: false, newUnlocks: [], completedChallenges: [], duplicate: true }
      const car = dto.selectedCarId
        ? await tx.car.findUnique({ where: { id: dto.selectedCarId } })
        : await tx.car.findUnique({ where: { key: 'starter' } })
      if (!car || !await tx.playerCar.findUnique({ where: { userId_carId: { userId, carId: car.id } } })) {
        fail(403, 'CAR_NOT_OWNED', 'You must own the selected car.')
      }
      const validation = validateRun(dto, car)
      const run = await tx.run.create({ data: {
        userId, submissionId, score: validation.score, distance: dto.distance, duration: dto.duration,
        maxSpeed: dto.maxSpeed, averageSpeed: validation.averageSpeed, nearMisses: dto.nearMisses,
        boostsUsed: dto.boostsUsed, collisions: dto.collisions, selectedCarId: car.id,
        isValid: validation.reason === null, validationReason: validation.reason,
      } })
      if (validation.reason) {
        this.logger.warn(`Invalid run ${run.id}: ${validation.reason}`)
        return { run, personalBest: false, newUnlocks: [], completedChallenges: [], duplicate: false }
      }
      const profile = await tx.playerProfile.findUniqueOrThrow({ where: { userId } })
      await tx.playerProfile.update({ where: { userId }, data: {
        totalRuns: { increment: 1 }, totalScore: { increment: run.score }, totalDistance: { increment: run.distance },
        bestScore: Math.max(profile.bestScore, run.score), longestDistance: Math.max(profile.longestDistance, run.distance),
        highestSpeed: Math.max(profile.highestSpeed, run.maxSpeed),
      } })
      const progression = await this.progress.apply(tx, run)
      return { run, personalBest: run.score > profile.bestScore, ...progression, duplicate: false }
    }, { timeout: 15000 })
  }

  async history(userId: string, query: RunsQuery) {
    const where = { userId }
    const [data, total] = await this.db.$transaction([
      this.db.run.findMany({ where, orderBy: [{ [query.sort]: query.order }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.db.run.count({ where }),
    ])
    return { data, pagination: pagination(query.page, query.limit, total) }
  }

  async one(userId: string, id: string) {
    const run = await this.db.run.findFirst({ where: { id, userId } })
    if (!run) fail(404, 'RUN_NOT_FOUND', 'Run not found.')
    return run
  }
}

@ApiTags('Runs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}
  @Post()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Save a completed run, validate it, and award progression atomically' })
  submit(@Req() request: PlayerRequest, @Body() dto: RunDto) { return this.runs.submit(request.user.id, dto) }

  @Get('me')
  @ApiOperation({ summary: 'Paginated personal run history, including invalid submissions' })
  history(@Req() request: PlayerRequest, @Query() query: RunsQuery) { return this.runs.history(request.user.id, query) }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of your own runs' })
  one(@Req() request: PlayerRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.runs.one(request.user.id, id) }
}

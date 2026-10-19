import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthGuard, publicUser } from './auth'
import type { PlayerRequest } from './auth'
import { Database } from './database'
import { LeaderboardQuery, PageDto } from './dto'
import { ProgressService } from './progress'
import { pagination } from './rules'

@ApiTags('Player')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly db: Database) {}
  @Get()
  @ApiOperation({ summary: 'Your account, without password data' })
  me(@Req() request: PlayerRequest) { return this.db.user.findUniqueOrThrow({ where: { id: request.user.id }, select: publicUser }) }

  @Get('stats')
  @ApiOperation({ summary: 'Statistics from valid runs; challenge rewards are separate' })
  stats(@Req() request: PlayerRequest) { return this.db.playerProfile.findUniqueOrThrow({ where: { userId: request.user.id } }) }
}

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly db: Database) {}
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Your rank among all players, including outside the first page' })
  async mine(@Req() request: PlayerRequest, @Query() query: LeaderboardQuery) {
    const field = { score: 'bestScore', distance: 'longestDistance', speed: 'highestSpeed' }[query.metric] as 'bestScore' | 'longestDistance' | 'highestSpeed'
    const profile = await this.db.playerProfile.findUniqueOrThrow({ where: { userId: request.user.id } })
    if (!profile.totalRuns) return { metric: query.metric, rank: null, value: 0 }
    const ahead = await this.db.playerProfile.count({ where: {
      totalRuns: { gt: 0 }, OR: [{ [field]: { gt: profile[field] } }, { [field]: profile[field], userId: { lt: request.user.id } }],
    } })
    return { metric: query.metric, rank: ahead + 1, value: profile[field] }
  }
  @Get()
  @ApiOperation({ summary: 'Global best results, one entry per player, ranked with deterministic ties' })
  async list(@Query() query: LeaderboardQuery) {
    const field = { score: 'bestScore', distance: 'longestDistance', speed: 'highestSpeed' }[query.metric]
    const where = { totalRuns: { gt: 0 } }
    const [profiles, total] = await this.db.$transaction([
      this.db.playerProfile.findMany({ where, include: { user: { select: { username: true } } }, orderBy: [{ [field]: 'desc' }, { userId: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.db.playerProfile.count({ where }),
    ])
    return {
      metric: query.metric,
      entries: profiles.map((profile, index) => ({ rank: (query.page - 1) * query.limit + index + 1, username: profile.user.username, value: profile[field as 'bestScore' | 'longestDistance' | 'highestSpeed'] })),
      pagination: pagination(query.page, query.limit, total),
    }
  }
}

@ApiTags('Cars')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cars')
export class CarsController {
  constructor(private readonly db: Database) {}
  @Get()
  @ApiOperation({ summary: 'Car catalogue with your ownership status' })
  async catalogue(@Req() request: PlayerRequest) {
    const cars = await this.db.car.findMany({ include: { players: { where: { userId: request.user.id }, select: { id: true } } }, orderBy: [{ isDefault: 'desc' }, { key: 'asc' }] })
    return cars.map(({ players, ...car }) => ({ ...car, owned: players.length > 0 }))
  }
  @Get('me')
  @ApiOperation({ summary: 'Your unlocked cars' })
  async owned(@Req() request: PlayerRequest) {
    return this.db.playerCar.findMany({ where: { userId: request.user.id }, include: { car: true }, orderBy: { unlockedAt: 'asc' } })
  }
}

@ApiTags('Challenges')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly db: Database, private readonly progress: ProgressService) {}
  @Get('daily')
  @ApiOperation({ summary: 'Today’s server-generated challenge (UTC)' })
  async daily(@Req() request: PlayerRequest) {
    const challenge = await this.progress.daily()
    const completed = await this.db.challengeCompletion.findUnique({ where: { challengeId_userId: { challengeId: challenge.id, userId: request.user.id } } })
    return { ...challenge, completed: completed !== null }
  }
  @Get('history')
  @ApiOperation({ summary: 'Your completed challenges, paginated' })
  async history(@Req() request: PlayerRequest, @Query() query: PageDto) {
    const where = { userId: request.user.id }
    const [data, total] = await this.db.$transaction([
      this.db.challengeCompletion.findMany({ where, include: { challenge: true }, orderBy: [{ completedAt: 'desc' }, { id: 'asc' }], take: query.limit, skip: (query.page - 1) * query.limit }),
      this.db.challengeCompletion.count({ where }),
    ])
    return { data, pagination: pagination(query.page, query.limit, total) }
  }
}


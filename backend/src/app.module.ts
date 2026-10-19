import { Controller, Get, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Database } from './database'
import { AuthController, AuthGuard, AuthService } from './auth'
import { RunsController, RunsService } from './runs'
import { CarsController, ChallengesController, LeaderboardController, UsersController } from './players'
import { ProgressService } from './progress'
import { configuration } from './config'

@ApiTags('Health')
@Controller('health')
class HealthController {
  constructor(private readonly db: Database) {}
  @Get()
  @ApiOperation({ summary: 'Check API and database health' })
  async health() {
    await this.db.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected' }
  }
}

@Module({
  imports: [
    JwtModule.registerAsync({ useFactory: () => {
      const config = configuration()
      return { secret: config.secret, signOptions: { expiresIn: config.seconds, algorithm: 'HS256', issuer: 'street-racer', audience: 'street-racer-player' } }
    } }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
  ],
  controllers: [HealthController, AuthController, RunsController, UsersController, LeaderboardController, CarsController, ChallengesController],
  providers: [Database, AuthService, AuthGuard, RunsService, ProgressService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

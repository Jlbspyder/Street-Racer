import { Body, CanActivate, Controller, ExecutionContext, Injectable, Logger, Post } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import * as bcrypt from 'bcrypt'
import type { Request } from 'express'
import { Database } from './database'
import { LoginDto, RegisterDto } from './dto'
import { configuration } from './config'
import { fail } from './errors'

export type PlayerRequest = Request & { user: { id: string } }
export const publicUser = { id: true, email: true, username: true, createdAt: true } as const

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly db: Database) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<PlayerRequest>()
    const [scheme, token, extra] = request.headers.authorization?.split(' ') ?? []
    if (scheme !== 'Bearer' || !token || extra) fail(401, 'UNAUTHORIZED', 'Please log in.')
    let id: string
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, { algorithms: ['HS256'], issuer: 'street-racer', audience: 'street-racer-player' })
      if (typeof payload.sub !== 'string') throw new Error('Invalid subject')
      id = payload.sub
    } catch { fail(401, 'UNAUTHORIZED', 'Your session has expired or is invalid.') }
    if (!await this.db.user.findUnique({ where: { id }, select: { id: true } })) fail(401, 'UNAUTHORIZED', 'Please log in.')
    request.user = { id }
    return true
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth')
  private readonly rounds = configuration().rounds
  private readonly dummyHash = bcrypt.hash('not-a-real-user-password', this.rounds)
  constructor(private readonly db: Database, private readonly jwt: JwtService) {}

  private async response(user: { id: string; email: string; username: string; createdAt: Date }) {
    return { user, accessToken: await this.jwt.signAsync({ sub: user.id }) }
  }

  async register(dto: RegisterDto) {
    if (Buffer.byteLength(dto.password, 'utf8') > 72) fail(400, 'INVALID_PASSWORD', 'Password must be at most 72 UTF-8 bytes.')
    const car = await this.db.car.findUnique({ where: { key: 'starter' } })
    if (!car) fail(503, 'SETUP_REQUIRED', 'Seed the car catalogue before registering.')
    const passwordHash = await bcrypt.hash(dto.password, this.rounds)
    const user = await this.db.user.create({
      data: { email: dto.email, username: dto.username, passwordHash, profile: { create: {} }, playerCars: { create: { carId: car.id } } },
      select: publicUser,
    })
    return this.response(user)
  }

  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email } })
    const matches = await bcrypt.compare(dto.password, user?.passwordHash ?? await this.dummyHash)
    if (!user || !matches || Buffer.byteLength(dto.password, 'utf8') > 72) {
      this.logger.warn('Rejected login attempt')
      fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
    }
    const { id, email, username, createdAt } = user
    return this.response({ id, email, username, createdAt })
  }
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register and receive a JWT access token' })
  register(@Body() dto: RegisterDto) { return this.auth.register(dto) }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  login(@Body() dto: LoginDto) { return this.auth.login(dto) }
}


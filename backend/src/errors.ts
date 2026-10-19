import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common'
import type { Response } from 'express'
import { Prisma } from './generated/prisma/client'

export function fail(status: number, code: string, message: string): never {
  throw new HttpException({ code, message }, status)
}

@Catch()
export class ApiErrors implements ExceptionFilter {
  private readonly logger = new Logger('API')
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    let statusCode = 500
    let code = 'INTERNAL_ERROR'
    let message: string | string[] = 'An unexpected error occurred.'
    if (error instanceof HttpException) {
      statusCode = error.getStatus()
      const body = error.getResponse()
      const details = typeof body === 'object' ? body as { message?: string | string[]; code?: string } : { message: body }
      message = details.message ?? error.message
      code = details.code ?? ({ 400: 'INVALID_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 429: 'RATE_LIMITED' }[statusCode] ?? 'REQUEST_FAILED')
    } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      statusCode = 409
      const fields = JSON.stringify(error.meta ?? {})
      code = fields.includes('email') ? 'EMAIL_ALREADY_EXISTS' : fields.includes('username') ? 'USERNAME_ALREADY_EXISTS' : 'ALREADY_EXISTS'
      message = code === 'EMAIL_ALREADY_EXISTS' ? 'Email is already registered.' : code === 'USERNAME_ALREADY_EXISTS' ? 'Username is already taken.' : 'This record already exists.'
    } else {
      // Avoid logging request bodies, credentials, tokens or database parameters.
      this.logger.error(`Unexpected ${error instanceof Error ? error.name : 'error'} while handling a request`)
    }
    const errorName = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 429: 'Too Many Requests', 503: 'Service Unavailable' }[statusCode] ?? 'Internal Server Error'
    response.status(statusCode).json({ statusCode, error: errorName, message, code })
  }
}


import 'dotenv/config'

export function configuration() {
  const secret = process.env.JWT_SECRET ?? ''
  if (secret.length < 32 || secret.includes('replace-')) throw new Error('Set JWT_SECRET to at least 32 random characters.')
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl?.startsWith('postgresql://')) throw new Error('Set a PostgreSQL DATABASE_URL.')
  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  const origin = new URL(frontend)
  if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== frontend) throw new Error('FRONTEND_URL must be a single origin without a trailing slash.')
  if (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:') throw new Error('Use HTTPS for the production frontend.')
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12)
  if (!Number.isInteger(rounds) || rounds < (process.env.NODE_ENV === 'test' ? 4 : 10) || rounds > 15) throw new Error('BCRYPT_ROUNDS must be between 10 and 15.')
  const expiry = /^(\d+)(s|m|h|d)$/.exec(process.env.JWT_EXPIRES_IN ?? '15m')
  if (!expiry) throw new Error('JWT_EXPIRES_IN must look like 15m or 1h.')
  const seconds = Number(expiry[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[expiry[2]] ?? 1)
  if (seconds < 60 || seconds > 86400) throw new Error('JWT lifetime must be between one minute and one day.')
  const port = Number(process.env.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT is invalid.')
  return { secret, databaseUrl, frontend, rounds, seconds, port }
}

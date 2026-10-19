import { existsSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

if (existsSync('.env')) {
  console.log('Keeping existing .env settings.')
} else {
  const password = randomBytes(24).toString('hex')
  const secret = randomBytes(48).toString('hex')
  writeFileSync('.env', `NODE_ENV=development\nPORT=3000\nDATABASE_URL=postgresql://postgres:${password}@127.0.0.1:55432/street_racer\nPOSTGRES_PASSWORD=${password}\nJWT_SECRET=${secret}\nJWT_EXPIRES_IN=15m\nFRONTEND_URL=http://localhost:5173\nBCRYPT_ROUNDS=12\n`, { mode: 0o600 })
  console.log('Created .env with random local credentials. It is excluded from source control.')
}


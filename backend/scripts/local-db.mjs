import 'dotenv/config'
import { existsSync } from 'node:fs'
import EmbeddedPostgres from 'embedded-postgres'
import pg from 'pg'

const url = new URL(process.env.DATABASE_URL ?? '')
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/street_racer') {
  throw new Error('db:local only starts the local street_racer development database.')
}
// Avoid starting a second copy when this database is already running.
const existing = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 2000 })
let alreadyRunning = false
try {
  await existing.connect()
  await existing.query('SELECT 1')
  alreadyRunning = true
} catch {
  // If no database is available, start it below.
} finally {
  await existing.end()
}
if (alreadyRunning) {
  console.log('Local PostgreSQL is already running on port ' + url.port + '. No need to start it again.')
  process.exit(0)
}
const database = new EmbeddedPostgres({
  databaseDir: './.postgres', user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
  port: Number(url.port || 55432), persistent: true, authMethod: 'scram-sha-256',
  postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
  onLog: message => console.log(String(message)), onError: message => console.error(String(message)),
})
if (!existsSync('.postgres/PG_VERSION')) await database.initialise()
await database.start()
const client = database.getPgClient()
await client.connect()
if (!(await client.query('SELECT 1 FROM pg_database WHERE datname = $1', ['street_racer'])).rowCount) {
  await database.createDatabase('street_racer')
}
await client.end()
console.log(`Local PostgreSQL is ready on 127.0.0.1:${url.port}. Leave this terminal running. Ctrl+C stops it without deleting data.`)
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await database.stop()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
setInterval(() => {}, 60000)

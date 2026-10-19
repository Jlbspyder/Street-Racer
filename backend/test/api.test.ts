import 'dotenv/config'
import 'reflect-metadata'
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'
import { NestFactory } from '@nestjs/core'
import type { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { AppModule } from '../src/app.module'
import { configureApp } from '../src/main'
import { Database } from '../src/database'
import { seed } from '../src/seed'

let app: INestApplication
let db: Database
let base: string
let admin: Client
const testDatabase = `street_racer_test_${randomBytes(6).toString('hex')}`
let token = ''
let otherToken = ''
let runId = ''
const valid = { score: 10000, distance: 1000, duration: 60, maxSpeed: 150 }

before(async () => {
  process.env.NODE_ENV = 'test'
  process.env.BCRYPT_ROUNDS = '4'
  const url = new URL(process.env.DATABASE_URL ?? '')
  // Tests create and later drop only a new, random database of their own.
  url.pathname = '/postgres'
  admin = new Client({ connectionString: url.toString() })
  await admin.connect()
  await admin.query(`CREATE DATABASE "${testDatabase}"`)
  url.pathname = `/${testDatabase}`
  process.env.DATABASE_URL = url.toString()
  const migration = new Client({ connectionString: url.toString() })
  await migration.connect()
  await migration.query(readFileSync(resolve('prisma/migrations/202610100001_init/migration.sql'), 'utf8'))
  await migration.end()
  app = await NestFactory.create(AppModule, { logger: false })
  configureApp(app)
  await app.listen(0, '127.0.0.1')
  base = await app.getUrl()
  db = app.get(Database)
  await seed(db)
})

after(async () => {
  if (app) await app.close()
  if (admin) {
    if (!/^street_racer_test_[a-f0-9]{12}$/.test(testDatabase)) throw new Error('Unsafe test database name')
    await admin.query(`DROP DATABASE IF EXISTS "${testDatabase}" WITH (FORCE)`)
    await admin.end()
  }
})

async function request(path: string, method = 'GET', body?: unknown, accessToken = token) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return { status: response.status, body: await response.json() }
}

test('backend end-to-end against PostgreSQL', async t => {
  await t.test('health and OpenAPI are available', async () => {
    assert.equal((await request('/health')).body.database, 'connected')
    const docs = await request('/api/docs-json')
    assert.ok(docs.body.paths['/auth/register'])
    assert.ok(docs.body.paths['/runs'])
  })
  await t.test('registration creates a hashed password, profile and default car', async () => {
    const result = await request('/auth/register', 'POST', { email: 'Player@Example.com', username: 'StreetKing', password: 'correct-horse-battery' })
    assert.equal(result.status, 201, JSON.stringify(result.body))
    token = result.body.accessToken
    assert.equal(result.body.user.username, 'streetking')
    assert.equal(result.body.user.passwordHash, undefined)
    const user = await db.user.findUniqueOrThrow({ where: { email: 'player@example.com' } })
    assert.notEqual(user.passwordHash, 'correct-horse-battery')
    assert.equal(await bcrypt.compare('correct-horse-battery', user.passwordHash), true)
    assert.equal((await request('/users/me/stats')).body.totalRuns, 0)
    assert.equal((await request('/cars/me')).body.length, 1)
  })
  await t.test('duplicate email, duplicate username and weak passwords are rejected', async () => {
    assert.equal((await request('/auth/register', 'POST', { email: 'PLAYER@example.com', username: 'another', password: 'correct-horse-battery' })).body.code, 'EMAIL_ALREADY_EXISTS')
    assert.equal((await request('/auth/register', 'POST', { email: 'new@example.com', username: 'STREETKING', password: 'correct-horse-battery' })).body.code, 'USERNAME_ALREADY_EXISTS')
    assert.equal((await request('/auth/register', 'POST', { email: 'weak@example.com', username: 'weak', password: 'short' })).status, 400)
    const other = await request('/auth/register', 'POST', { email: 'other@example.com', username: 'otherplayer', password: 'another-good-password' })
    assert.equal(other.status, 201)
    otherToken = other.body.accessToken
  })
  await t.test('login is generic on failure and rejects invalid tokens', async () => {
    const login = await request('/auth/login', 'POST', { email: 'player@example.com', password: 'correct-horse-battery' })
    assert.equal(login.status, 201)
    const wrong = await request('/auth/login', 'POST', { email: 'player@example.com', password: 'incorrect-password' })
    const missing = await request('/auth/login', 'POST', { email: 'nobody@example.com', password: 'incorrect-password' })
    assert.deepEqual(wrong.body, missing.body)
    assert.equal(wrong.status, 401)
    assert.equal((await request('/runs', 'POST', valid, '')).status, 401)
    assert.equal((await request('/users/me', 'GET', undefined, 'invalid')).status, 401)
    const expired = await app.get(JwtService).signAsync({ sub: login.body.user.id }, { expiresIn: -1 })
    assert.equal((await request('/users/me', 'GET', undefined, expired)).status, 401)
  })
  await t.test('strict payloads reject impersonation, nulls, and bad pagination', async () => {
    assert.equal((await request('/runs', 'POST', { ...valid, userId: randomUUID() })).status, 400)
    assert.equal((await request('/runs', 'POST', { ...valid, collisions: null })).status, 400)
    assert.equal((await request('/runs', 'POST', { ...valid, duration: 0 })).status, 400)
    assert.equal((await request('/runs/me?limit=1000')).status, 400)
    assert.equal((await request('/leaderboard?metric=anything')).status, 400)
  })
  await t.test('valid runs update stats once and are private', async () => {
    const submissionId = randomUUID()
    const result = await request('/runs', 'POST', { ...valid, submissionId })
    assert.equal(result.status, 201)
    assert.equal(result.body.run.isValid, true)
    assert.equal(result.body.personalBest, true)
    runId = result.body.run.id
    const duplicate = await request('/runs', 'POST', { ...valid, submissionId })
    assert.equal(duplicate.body.run.id, runId)
    assert.equal(duplicate.body.duplicate, true)
    assert.equal((await request('/users/me/stats')).body.totalRuns, 1)
    assert.equal((await request(`/runs/${runId}`)).status, 200)
    assert.equal((await request(`/runs/${runId}`, 'GET', undefined, otherToken)).status, 404)
    assert.equal((await request('/runs/me?page=1&limit=1')).body.pagination.total, 1)
  })
  await t.test('invalid runs do not change stats, rankings, challenges or unlocks', async () => {
    const stats = (await request('/users/me/stats')).body
    for (const change of [{ maxSpeed: 950 }, { duration: 1 }, { score: 999999 }]) {
      const result = await request('/runs', 'POST', { ...valid, ...change })
      assert.equal(result.body.run.isValid, false)
      assert.ok(result.body.run.validationReason)
      assert.equal(result.body.newUnlocks.length, 0)
      assert.equal(result.body.completedChallenges.length, 0)
    }
    assert.deepEqual((await request('/users/me/stats')).body, stats)
    for (const metric of ['score', 'distance', 'speed']) {
      const board = (await request(`/leaderboard?metric=${metric}`, 'GET', undefined, '')).body
      assert.equal(board.entries.length, 1)
      assert.equal(board.entries[0].username, 'streetking')
    }
    const cars = (await request('/cars')).body
    const locked = cars.find((car: { owned: boolean }) => !car.owned)
    assert.equal((await request('/runs', 'POST', { ...valid, selectedCarId: locked.id })).body.code, 'CAR_NOT_OWNED')
  })
  await t.test('daily challenges reward once and qualifying runs unlock a car', async () => {
    const daily = (await request('/challenges/daily')).body
    assert.equal(daily.completed, false)
    const long = { score: 100000, distance: 10000, duration: 600, maxSpeed: 150, collisions: 0 }
    const result = await request('/runs', 'POST', long)
    assert.equal(result.body.completedChallenges.length, 1)
    assert.ok(result.body.newUnlocks.some((car: { key: string }) => car.key === 'falcon'))
    const again = await request('/runs', 'POST', long)
    assert.equal(again.body.completedChallenges.length, 0)
    assert.equal((await request('/users/me/stats')).body.rewardPoints, daily.reward)
    assert.equal((await request('/challenges/history')).body.pagination.total, 1)
    assert.equal((await request('/challenges/daily')).body.completed, true)
  })
  await t.test('concurrent submissions preserve totals and prevent duplicate rewards', async () => {
    const before = (await request('/users/me/stats')).body
    const submissionId = randomUUID()
    const results = await Promise.all([
      request('/runs', 'POST', { ...valid, submissionId }),
      request('/runs', 'POST', { ...valid, submissionId }),
      request('/runs', 'POST', { ...valid, submissionId: randomUUID() }),
    ])
    assert.ok(results.every(result => result.status === 201))
    const stats = (await request('/users/me/stats')).body
    assert.equal(stats.totalRuns, before.totalRuns + 2)
    assert.equal(stats.totalDistance, before.totalDistance + 2000)
    assert.equal(stats.bestScore, 100000)
  })
  await t.test('authentication rate limits return consistent errors', async () => {
    let last
    for (let i = 0; i < 11; i++) last = await request('/auth/login', 'POST', { email: 'nobody@example.com', password: 'incorrect-password' })
    assert.equal(last?.status, 429)
    assert.equal(last?.body.code, 'RATE_LIMITED')
  })
})

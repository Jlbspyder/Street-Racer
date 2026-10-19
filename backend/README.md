# Street Racer backend

A single NestJS REST service with PostgreSQL and Prisma. It owns accounts, saved
runs, statistics, leaderboards, daily challenges and unlocked cars. The React
client continues to own driving and rendering.

## Requirements

Node.js 22.12 or later. Use the project-local PostgreSQL launcher below, an
existing PostgreSQL server, or Docker. The local launcher stores data in
`backend/.postgres`; it does not install a system service.

## Local setup (no Docker needed)

Run from the project root:

```bash
npm install
npm install --prefix backend
npm run setup:local --prefix backend
npm run build --prefix backend
npm run db:local --prefix backend
```

Leave that database terminal running. In another terminal:

```bash
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
npm run start:dev --prefix backend
```

In a third terminal, start the game:

```bash
npm run dev
```

- Game: http://localhost:5173
- API health: http://localhost:3000/health
- Swagger: http://localhost:3000/api/docs
- OpenAPI JSON: http://localhost:3000/api/docs-json

The Vite development proxy forwards `/api` calls to the backend, including when
you access Vite from a phone. For production, set the frontend's `VITE_API_URL`
to the deployed API origin before building, or configure a matching reverse proxy.

`setup:local` creates a gitignored `.env` with random credentials and never
overwrites an existing file. The API refuses missing/placeholder JWT secrets.
To use an existing database, set `DATABASE_URL` in `backend/.env` and skip
`db:local`. The database role must be allowed to apply migrations.

## Playing and saving

Open **Profile & rankings** to register or log in. Passwords must be 10-64
characters and at most 72 UTF-8 bytes; usernames are 3-24 letters, digits or
underscores. Email and username are normalized to lowercase.

Pause a race, choose **Finish run**, and choose **Save run to account**. This is
intentional: collisions do not end a run. Guest play still works without the
server. A failed save can be retried while the result screen stays open. Starting
a new run discards the previous unsaved result. A run's submission UUID makes
network retries safe without awarding progression twice.

Tokens expire after 15 minutes by default. The frontend keeps the token in
session storage, supports signing in again to save a finished run, and does not
implement refresh tokens. Server-side progression is available on another device
after signing in. Car selection is fixed for the current run; choose unlocked
cars before the next run. Selecting one changes its colour and driving stats.

## Endpoints

All routes except health, authentication and the public leaderboard require
`Authorization: Bearer <accessToken>`.

| Method | Route | Result |
| --- | --- | --- |
| POST | /auth/register | Public user fields and accessToken |
| POST | /auth/login | Public user fields and accessToken |
| GET | /users/me | Current account, never passwordHash |
| GET | /users/me/stats | Totals, records and challenge rewardPoints |
| POST | /runs | run, personalBest, newUnlocks, completedChallenges, duplicate |
| GET | /runs/me | Paginated personal runs, including invalid ones |
| GET | /runs/:id | One of the authenticated player's runs |
| GET | /leaderboard | One best result per player |
| GET | /leaderboard/me | Current player's rank and value |
| GET | /cars | Catalogue with owned flags |
| GET | /cars/me | Owned cars and unlock timestamps |
| GET | /challenges/daily | Current UTC challenge and completion status |
| GET | /challenges/history | Paginated completed challenges |
| GET | /health | API and database health |

History supports `page` (default 1) and `limit` (default 20, maximum 100).
Run history additionally supports `sort=createdAt|score|distance|maxSpeed` and
`order=asc|desc`. Leaderboards support `metric=score|distance|speed` plus pagination.
Ties use a stable user-ID order. `/leaderboard/me` reports the full ranking even
when that player is outside the first page.

Example run body:

```json
{
  "submissionId": "b696cd4e-2585-4cb7-a5d0-8fd8c04ad47f",
  "score": 10000,
  "distance": 1000,
  "duration": 60,
  "maxSpeed": 150,
  "collisions": 0,
  "boostsUsed": 1
}
```

`selectedCarId` is optional and defaults to the starter car. `averageSpeed` and
`nearMisses` are optional. Unknown fields, including a client-provided `userId`,
are rejected. Speed is km/h, distance is metres, and duration is active seconds
excluding pauses. Sessions are limited to six active hours.

Errors have this shape:

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Please log in.",
  "code": "UNAUTHORIZED"
}
```

Request bodies, examples, authentication and response examples are also in Swagger.

## Rules and consistency

- Run score is recalculated as `floor(distance * 10)`, matching the game.
- Maximum speed allows the selected car's normal speed plus 72 km/h of nitro,
  with 2 km/h tolerance. Distance must fit the reported maximum speed and duration.
- Reported average speed and collision frequency are checked.
- Schema-invalid requests return 400; impossible but well-formed runs are stored
  with `isValid=false` and a reason. They award no statistics, ranks, rewards or cars.
- All run, profile, challenge and unlock changes share one transaction. A per-player
  row lock prevents concurrent submissions from losing totals or duplicating rewards.
- Only a player's best valid result appears on each leaderboard.
- Challenges are created on demand for the current UTC day, so no scheduler is
  needed. The submission time determines the day's challenge, and each reward is
  granted once. Reward points are separate from run scores and leaderboard values.
- Cars unlock at 50 km total distance (Vortex), a 100,000-point best run (Falcon),
  and five completed daily challenges (Night Runner).

This is basic plausibility checking, not authoritative anti-cheat. A modified
client can still fabricate values that fit these limits. Server-issued sessions,
replays and real-time verification are deliberately not implemented.

## Tests and checks

With the local database running:

```bash
npm test --prefix backend
npm run lint
npm run build
```

Tests create a uniquely named PostgreSQL test database, apply the committed schema,
run real HTTP requests and delete only that test database. The test database role
therefore needs CREATE DATABASE permission. Do not use production credentials.
Coverage includes registration, bcrypt verification, duplicate accounts, login,
JWT expiry, strict validation, ownership, private history, invalid-run exclusion,
leaderboards, challenge rewards, unlocks, concurrent/idempotent saves and rate limits.

## Docker and deployment

From `backend`, run `docker compose up --build`. Stop `db:local` first because
both configurations use port 55432. Compose starts PostgreSQL and the API; database
files are kept in a named volume. The API applies migrations and seeds the catalogue
before starting. Docker has not been required for the local setup above.

For independent hosting: provide PostgreSQL, configure the environment, install
with `npm ci`, run `npm run build`, `npm run db:migrate`, `npm run db:seed`, then
`npm start`. Use Node 22.12+, HTTPS at the hosting proxy, `NODE_ENV=production`,
a strong JWT secret and an exact HTTPS `FRONTEND_URL`. Keep database backups.
Never publish `.env`, database files or PostgreSQL directly to the internet.

The in-memory rate limiter is designed for one API instance: 5 registrations,
10 login attempts and 30 run submissions per IP per minute; other routes default
to 120. Proxy trust is intentionally off. If deployed behind a proxy, configure
trust for that known proxy before using IP-based rate limits; do not blindly
trust arbitrary `X-Forwarded-For` headers.

## Small code layout

- `auth.ts`: registration, login and JWT guard.
- `runs.ts`: saving, validation orchestration and run history.
- `rules.ts`: simple score, plausibility, unlock and challenge rules.
- `progress.ts`: daily objectives and unlocks.
- `players.ts`: profile, stats, leaderboard, cars and challenge read endpoints.
- `dto.ts`: request validation; `database.ts`: Prisma connection.
- `main.ts` / `app.module.ts`: startup, CORS, rate limits and Swagger.

There are no microservices, Redis, queues, multiplayer, payments or extra repository
layers. OAuth, refresh tokens, administrative tools and deployment to a hosting
account remain future work.

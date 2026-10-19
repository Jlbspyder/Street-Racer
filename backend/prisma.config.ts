import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'ts-node src/seed.ts' },
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:55432/street_racer' },
})

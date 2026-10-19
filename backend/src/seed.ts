import 'dotenv/config'
import { Database } from './database'

export async function seed(db: Database) {
  const cars = [
    { key: 'starter', name: 'Street One', topSpeed: 201.6, acceleration: 19, handling: 8, isDefault: true, unlockType: null, unlockRequirement: null },
    { key: 'vortex', name: 'Vortex', topSpeed: 216, acceleration: 20, handling: 8, isDefault: false, unlockType: 'distance', unlockRequirement: 50000 },
    { key: 'falcon', name: 'Falcon', topSpeed: 225, acceleration: 21, handling: 8.5, isDefault: false, unlockType: 'score', unlockRequirement: 100000 },
    { key: 'night-runner', name: 'Night Runner', topSpeed: 234, acceleration: 22, handling: 9, isDefault: false, unlockType: 'challenges', unlockRequirement: 5 },
  ]
  for (const car of cars) await db.car.upsert({ where: { key: car.key }, create: car, update: car })
}

if (require.main === module) {
  const db = new Database()
  seed(db).then(() => console.log('Seeded four cars.')).catch(() => { console.error('Seeding failed. Check database setup.'); process.exitCode = 1 }).finally(() => db.$disconnect())
}

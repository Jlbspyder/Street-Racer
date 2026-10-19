# Street Racer

A browser-based 3D arcade racing game built with React, TypeScript, and Three.js. Drive through a 5 km city course, navigate traffic and bends, and use nitro to increase your speed. Play as a guest or sign in to save runs and track your progress.

## Features

- A 5 km race with a chequered finish line and three-lane roads with bends, open streets, bridges, and tunnels.
- Low-poly cars and city scenery with a third-person chase camera.
- Acceleration, braking, steering, traffic, and rechargeable nitro.
- Collision effects and slowdown without ending the race.
- Live route map, speedometer, distance, score, and nitro meter.
- Recorded engine audio with a mute toggle.
- Responsive layout with keyboard and mobile touch controls.
- Pause, resume, and locally saved personal best scores.
- Accounts, saved runs, leaderboards, daily challenges, and unlockable cars through the companion backend.

## Links

Live Site URL: [https://street-racer-ten.vercel.app/](https://street-racer-ten.vercel.app/)

## Tech stack

React, TypeScript, Vite, Three.js, React Three Fiber, Drei, and Zustand. The backend uses NestJS, Prisma, and PostgreSQL.

## Getting started

Use Node.js 22.12 or later, npm, and a WebGL-capable browser with hardware acceleration enabled.

From the project root:

```bash
npm install
npm run dev
```

Guest play works without the backend. For accounts and saved progression, follow the [backend setup guide](backend/README.md).

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Accelerate | W / Up arrow | Hold GAS |
| Brake | S / Down arrow | Hold BRAKE |
| Steer | A / D or Left / Right arrows | Hold a direction arrow |
| Nitro | Hold Space while accelerating | Hold NITRO and GAS |
| Pause / resume | Escape or on-screen button | On-screen button |

Touch controls support holding multiple buttons together. Landscape orientation provides a wider view of the road.

Collisions slow the car but do not end the run. Steer away and continue driving.

The race finishes automatically at 5 km. Select **Save run to account** on the result screen to save your result. You can also pause and choose **End run early**. Save before starting another race. Open **Profile & rankings** to sign in, view records, check challenges, and select an unlocked car for your next run.

## Playing on a phone

Start the development server with network access:

```bash
npm run dev -- --host 0.0.0.0
```

Connect your phone to the same local network and open the network address printed by Vite. Your computer's firewall must allow access to the development server.

## Backend configuration

During development, Vite forwards `/api` requests to `http://127.0.0.1:3000`. No frontend environment file is needed for this setup.

For a hosted backend, set this variable in the frontend hosting environment or a root `.env` file before building:

```env
VITE_API_URL=https://your-backend-domain
```

See [.env](.env). Database credentials and JWT secrets belong only in the backend environment.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Check TypeScript and build the frontend into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Deployment

Set `VITE_API_URL` to your hosted backend address, then build:

```bash
npm run build
```

Publish `dist/` to a static hosting provider. Set the backend's `FRONTEND_URL` to the public frontend origin without a trailing slash. Changes to frontend environment variables require a new build.

The API and PostgreSQL database are hosted separately. See the [backend README](backend/README.md) for migrations, seeding, and deployment details.

## Project structure

```text
src/
  App.tsx             Menus and heads-up display
  App.css             Layout and responsive styles
  game/
    Game.tsx          Driving, traffic, collisions, and camera
    World.tsx         Recycled roads and city scenery
    Car.tsx           Low-poly car model
    route.ts          Road curves
    RouteMap.tsx       Live route map
    store.ts          Shared game state
    TouchControls.tsx Mobile controls
    EngineAudio.tsx   Audio controls and game integration
    engineSound.ts    Engine audio playback
  account/            Accounts, rankings, and saved runs
public/audio/         Engine recording and attribution
backend/              NestJS API and PostgreSQL setup
```

## Audio credits

Engine recording: **Car Engine Loop 96kHz, 4s** by **qubodup**, licensed under **Creative Commons Attribution 3.0**. See [public/audio/credits.txt](public/audio/credits.txt) for the source and license details.

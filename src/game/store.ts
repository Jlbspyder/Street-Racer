import { create } from 'zustand'

export type Control = 'left' | 'right' | 'accelerate' | 'brake' | 'nitro'
const releasedControls = { left: false, right: false, accelerate: false, brake: false, nitro: false }

export type DriveCar = { id: string; key: string; name: string; topSpeed: number; acceleration: number; handling: number }
export type Status = 'ready' | 'playing' | 'paused' | 'finished'

function readBest() {
  try { return Number(localStorage.getItem('street-racer-best')) || 0 }
  catch { return 0 }
}

export const useGame = create<{
  status: Status
  duration: number
  maxSpeed: number
  boostsUsed: number
  submissionId: string
  selectedCar: DriveCar | null
  runCar: DriveCar | null
  selectCar: (car: DriveCar | null) => void
  finish: () => void
  lateral: number
  controls: Record<Control, boolean>
  setControl: (control: Control, pressed: boolean) => void
  clearControls: () => void
  speed: number
  distance: number
  score: number
  boost: number
  best: number
  run: number
  impacts: number
  start: () => void
  pause: () => void
  saveBest: () => void
}>((set, get) => ({
  duration: 0, maxSpeed: 0, boostsUsed: 0, submissionId: '', selectedCar: null, runCar: null,
  selectCar: car => {
    if (car === null || get().status === 'ready' || get().status === 'finished') set({ selectedCar: car })
  },
  finish: () => {
    if (get().status !== 'playing' && get().status !== 'paused') return
    get().saveBest()
    set({ status: 'finished', controls: { ...releasedControls } })
  },
  lateral: 0, controls: { ...releasedControls },
  setControl: (control, pressed) => {
    if (pressed && get().status !== 'playing') return
    if (get().controls[control] === pressed) return
    set({ controls: { ...get().controls, [control]: pressed } })
  },
  clearControls: () => set({ controls: { ...releasedControls } }),
  status: 'ready', speed: 0, distance: 0, score: 0, boost: 100, best: readBest(), run: 0, impacts: 0,
  start: () => set({ duration: 0, maxSpeed: 0, boostsUsed: 0, submissionId: newRunId(), runCar: get().selectedCar, lateral: 0, controls: { ...releasedControls }, status: 'playing', speed: 0, distance: 0, score: 0, boost: 100, impacts: 0, run: get().run + 1 }),
  pause: () => {
    const status = get().status
    if (status === 'playing' || status === 'paused') {
      get().saveBest()
      set({ status: status === 'playing' ? 'paused' : 'playing', controls: { ...releasedControls } })
    }
  },
  saveBest: () => {
    try { localStorage.setItem('street-racer-best', String(get().best)) } catch { /* Storage is optional. */ }
  },
}))


function newRunId() {
  // getRandomValues also works when testing a phone over local HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

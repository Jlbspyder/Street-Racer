// Recorded car engine by qubodup. Attribution is in public/audio/credits.txt.
export async function createEngineSound(context: AudioContext) {
  const response = await fetch(`${import.meta.env.BASE_URL}audio/car-engine.wav`)
  if (!response.ok) throw new Error('The car engine recording could not be loaded.')
  const buffer = await context.decodeAudioData(await response.arrayBuffer())
  if (context.state === 'closed') throw new Error('Audio was closed while loading.')

  const engine = context.createBufferSource()
  engine.buffer = buffer
  engine.loop = true
  engine.playbackRate.value = 0.6

  // Two gentle low-pass filters remove the recording's high-pitched whine.
  const filters = [context.createBiquadFilter(), context.createBiquadFilter()]
  filters.forEach(filter => {
    filter.type = 'lowpass'
    filter.frequency.value = 420
    filter.Q.value = 0.5
  })
  const volume = context.createGain()
  volume.gain.value = 0
  engine.connect(filters[0])
  filters[0].connect(filters[1])
  filters[1].connect(volume)
  volume.connect(context.destination)
  engine.start()
  let stopped = false

  return {
    update(speed: number, accelerating: boolean, audible: boolean) {
      if (stopped) return
      // A steady, low hum with only a small rise under acceleration.
      const pace = Math.max(0, Math.min(speed / 274, 1))
      const rate = 0.6 + pace * 0.12 + (accelerating ? 0.02 : 0)
      const now = context.currentTime
      engine.playbackRate.setTargetAtTime(rate, now, 0.4)
      const loudness = speed < 2 && !accelerating ? 0.24 : accelerating ? 0.38 : 0.29
      volume.gain.setTargetAtTime(audible ? loudness : 0, now, audible ? 0.2 : 0.04)
    },
    silence() {
      volume.gain.setTargetAtTime(0, context.currentTime, 0.02)
    },
    stop() {
      if (stopped) return
      stopped = true
      engine.stop()
      engine.disconnect()
      filters.forEach(filter => filter.disconnect())
      volume.disconnect()
    },
  }
}

import { useEffect, useRef, useState } from 'react'
import { useGame } from './store'
import { createEngineSound } from './engineSound'

export function EngineAudio() {
  const [muted, setMuted] = useState(false)
  const [failed, setFailed] = useState(false)
  const mutedRef = useRef(false)
  const refresh = useRef(() => {})

  useEffect(() => {
    let context: AudioContext | undefined
    let sound: Awaited<ReturnType<typeof createEngineSound>> | undefined
    let loading = false
    let disposed = false
    const keys = new Set<string>()

    function update() {
      if (!context) return
      const game = useGame.getState()

      const accelerating = (keys.has('KeyW') || keys.has('ArrowUp') || game.controls.accelerate) &&
        !keys.has('KeyS') && !keys.has('ArrowDown') && !game.controls.brake
      sound?.update(
        game.speed,
        accelerating,
        game.status === 'playing' && !document.hidden && !mutedRef.current,
      )
    }

    function unlock() {
      // Browsers require a click or key press before audio can play.
      if (!context) {
        if (!window.AudioContext) return
        try {
          context = new AudioContext()
        } catch {
          return // Driving still works if audio is unavailable.
        }

      }
      if (!sound && !loading) {
        loading = true
        setFailed(false)
        void createEngineSound(context).then(recording => {
          if (disposed) {
            recording.stop()
            return
          }
          sound = recording
          update()
        }).catch(() => {
          if (!disposed) setFailed(true)
        }).finally(() => { loading = false })
      }
      if (context.state === 'suspended') void context.resume().catch(() => {})
      update()
    }

    function down(event: KeyboardEvent) {
      keys.add(event.code)
      unlock()
    }
    function up(event: KeyboardEvent) {
      keys.delete(event.code)
      update()
    }
    function silence() {
      keys.clear()
      sound?.silence()
    }
    function visibility() {
      if (document.hidden) silence()
    }

    refresh.current = update
    const unsubscribe = useGame.subscribe((state) => {
      if (state.status !== 'playing') keys.clear()
      update()
    })
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', silence)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      disposed = true
      unsubscribe()
      refresh.current = () => {}
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', silence)
      document.removeEventListener('visibilitychange', visibility)
      if (context) {
        sound?.stop()
        void context.close().catch(() => {})
      }
    }
  }, [])

  return <button className="quiet" aria-label={failed ? "Retry engine sound" : "Mute engine sound"} aria-pressed={muted} onClick={() => {
    if (failed) return
    mutedRef.current = !mutedRef.current
    setMuted(mutedRef.current)
    refresh.current()
  }}>
    {failed ? 'SOUND RETRY' : `SOUND ${muted ? 'OFF' : 'ON'}`}
  </button>
}





import { useEffect, useRef } from 'react'
import { useGame } from './store'
import type { Control } from './store'

function TouchButton({ control, label, text }: { control: Control; label: string; text: string }) {
  const pressed = useGame(state => state.controls[control])
  const pointers = useRef(new Set<number>())
  function release(pointerId: number) {
    pointers.current.delete(pointerId)
    useGame.getState().setControl(control, pointers.current.size > 0)
  }
  return <button className={`touch-button touch-${control}`} aria-label={label} aria-pressed={pressed}
    onContextMenu={event => event.preventDefault()}
    onPointerDown={event => {
      if (event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      pointers.current.add(event.pointerId)
      useGame.getState().setControl(control, true)
    }}
    onPointerUp={event => release(event.pointerId)}
    onPointerCancel={event => release(event.pointerId)}
    onLostPointerCapture={event => release(event.pointerId)}
  >{text}</button>
}

export function TouchControls() {
  const playing = useGame(state => state.status === 'playing')
  useEffect(() => {
    const clear = () => useGame.getState().clearControls()
    const visibility = () => { if (document.hidden) clear() }
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      clear()
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  if (!playing) return null
  return <div className="touch-controls" aria-label="Touch driving controls">
    <div className="touch-steering">
      <TouchButton control="left" label="Steer left" text="←" />
      <TouchButton control="right" label="Steer right" text="→" />
    </div>
    <div className="touch-pedals">
      <TouchButton control="nitro" label="Nitro, hold with gas" text="NITRO" />
      <TouchButton control="brake" label="Brake" text="BRAKE" />
      <TouchButton control="accelerate" label="Accelerate" text="GAS" />
    </div>
  </div>
}

import { useGame } from './store'
import { RACE_DISTANCE, roadX, roadSlope } from './route'

export function RouteMap() {
  const distance = useGame(state => state.distance)
  const remaining = Math.max(0, RACE_DISTANCE - distance)
  const lateral = useGame(state => state.lateral)
  const points = Array.from({ length: 61 }, (_, i) => {
    const ahead = Math.min(i * 4, remaining)
    return `${80 + roadX(distance + ahead) * 0.9},${142 - ahead * 0.52}`
  }).join(' ')
  const playerX = 80 + (roadX(distance) + lateral) * 0.9
  const heading = Math.atan(roadSlope(distance)) * 180 / Math.PI

  return <aside className="route-map" aria-label="Live route map showing your position and the next 240 metres">
    <div>ROUTE <span>240 M AHEAD</span></div>
    <svg viewBox="0 0 160 160" role="img" aria-label="Upcoming bends; the yellow arrow is your car">
      <polyline points={points} fill="none" stroke="#728698" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={points} fill="none" stroke="#233647" strokeWidth="8" strokeLinejoin="round" />
      <polyline points={points} fill="none" stroke="#b8d0d8" strokeWidth="1" strokeDasharray="3 5" />
      {remaining <= 240 && <rect x={80 + roadX(RACE_DISTANCE) * 0.9 - 6} y={142 - remaining * 0.52 - 2} width="12" height="4" fill="#ffffff" stroke="#142237" />}
      <g transform={`translate(${playerX} 142) rotate(${heading})`}>
        <path d="M 0 -7 L 5 5 L 0 3 L -5 5 Z" fill="#edfa68" stroke="#142237" strokeWidth="1.5" />
      </g>
    </svg>
    <small>▲ YOU · ENDLESS ROUTE</small>
  </aside>
}

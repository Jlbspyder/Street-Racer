import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box } from '@react-three/drei'
import { BoxGeometry } from 'three'
import type { Group } from 'three'
import { RACE_DISTANCE, roadX, roadSlope, segmentZ } from './route'

type Point = [number, number, number]

function Block({ position, size, color }: { position: Point; size: Point; color: string }) {
  return <Box position={position} args={size}><meshStandardMaterial color={color} /></Box>
}

// Subdivide long surfaces before bending them, so adjacent sections meet exactly.
function RoadStrip({ start, x, y, width, height, from = 0, length = 80, color }: {
  start: number; x: number; y: number; width: number; height: number;
  from?: number; length?: number; color: string
}) {
  const geometry = useMemo(() => {
    const shape = new BoxGeometry(width, height, length, 1, 1, Math.ceil(length / 4))
    shape.translate(x, y, -from - length / 2)
    const points = shape.attributes.position
    for (let i = 0; i < points.count; i++) {
      points.setX(i, points.getX(i) + roadX(start - points.getZ(i)))
    }
    shape.computeVertexNormals()
    return shape
  }, [start, x, y, width, height, from, length])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry}><meshStandardMaterial color={color} /></mesh>
}

function Segment({ index, travel }: { index: number; travel: { current: number } }) {
  const group = useRef<Group>(null)
  const start = index * 80
  const bridge = index === 3
  const tunnel = index === 6
  useFrame(() => {
    if (!group.current) return
    group.current.position.set(-roadX(travel.current), 0, segmentZ(index, travel.current))
  })

  return <group ref={group}>
    <RoadStrip start={start} x={0} y={-0.16} width={12} height={0.3} color="#263343" />
    {[-2, 2].map(x => Array.from({ length: 10 }, (_, i) =>
      <RoadStrip key={`${x}-${i}`} start={start} x={x} y={0.015} width={0.1} height={0.02} from={i * 8 + 2} length={3.5} color="#acbec7" />
    ))}
    {[-1, 1].map(side => <group key={side}>
      <RoadStrip start={start} x={side * 5.7} y={0.02} width={0.12} height={0.03} color="#e8ce7a" />
      <RoadStrip start={start} x={side * 8} y={0.1} width={4} height={0.4} color="#566576" />
      <RoadStrip start={start} x={side * 6.05} y={bridge || tunnel ? 0.5 : 0.18} width={0.18} height={bridge || tunnel ? 0.6 : 0.22} color="#8997a6" />
      {[10, 35, 60].map((z, i) => <group key={z} position={[roadX(start + z), 0, -z]} rotation={[0, -Math.atan(roadSlope(start + z)), 0]}>
        <Block position={[side * 7, 3.5, 0]} size={[0.12, 7, 0.12]} color="#607487" />
        <Block position={[side * 5.9, 7, 0]} size={[2.3, 0.12, 0.15]} color="#607487" />
        <Box position={[side * 5, 6.9, 0]} args={[0.8, 0.08, 0.35]}><meshStandardMaterial color="#b7efff" emissive="#84dfff" emissiveIntensity={3} /></Box>
        {!bridge && !tunnel && <>
          <Block position={[side * (16 + i), (10 + (index * 7 + i * 11) % 24) / 2, 0]} size={[7, 10 + (index * 7 + i * 11) % 24, 17]} color={['#31475e', '#39435b', '#46576b'][i]} />
          {[3, 6, 9].map(y => <Box key={y} position={[side * (12.45 + i), y, 0]} args={[0.04, 0.65, 13]}><meshStandardMaterial color="#91c9d6" emissive="#408391" emissiveIntensity={0.55} /></Box>)}
          <Block position={[side * 9, 1.5, 5]} size={[0.25, 2.3, 0.25]} color="#665647" />
          <mesh position={[side * 9, 3.2, 5]}><icosahedronGeometry args={[1.45, 0]} /><meshStandardMaterial color="#42796d" /></mesh>
          <Block position={[side * 9, 0.65, -5]} size={[0.7, 0.16, 2.4]} color="#ba956b" />
          <Block position={[side * 9.3, 1, -5]} size={[0.12, 0.7, 2.4]} color="#ba956b" />
          <Block position={[side * 9, 0.3, -5]} size={[0.5, 0.6, 1.8]} color="#283441" />
          <Block position={[side * 12.4, 1.4, 0]} size={[0.12, 2.3, 9]} color="#294b58" />
          <Box position={[side * 12.3, 2.6, 0]} args={[0.18, 0.28, 9]}><meshStandardMaterial color="#ffd69c" emissive="#e2a05e" emissiveIntensity={0.7} /></Box>
        </>}
        {bridge && <Block position={[side * 8, 5, 0]} size={[0.7, 10, 0.8]} color="#507c8b" />}
      </group>)}
      {bridge && <RoadStrip start={start} x={side * 8} y={9} width={0.5} height={0.5} color="#7099a3" />}
      {tunnel && <RoadStrip start={start} x={side * 8} y={4} width={1} height={8} from={22} length={36} color="#3e4b60" />}
    </group>)}
    {tunnel && <>
      <RoadStrip start={start} x={0} y={8} width={17} height={0.5} from={22} length={36} color="#283448" />
      {[28, 40, 52].map(z => <Box key={z} position={[roadX(start + z), 7.7, -z]} args={[10, 0.08, 0.3]}><meshStandardMaterial emissive="#a5dbff" emissiveIntensity={2} /></Box>)}
    </>}
    {bridge && <group position={[roadX(start + 72), 0, -72]} rotation={[0, -Math.atan(roadSlope(start + 72)), 0]}>
      <Block position={[-6.8, 4, 0]} size={[0.15, 8, 0.15]} color="#79909a" />
      <Block position={[0, 7.6, 0]} size={[14, 0.15, 0.15]} color="#79909a" />
      <Block position={[0, 6.7, 0]} size={[6, 1.6, 0.18]} color="#196c69" />
      {[-2, 0, 2].map(x => <group key={x}>
        <Block position={[x, 6.8, 0.12]} size={[0.09, 0.7, 0.03]} color="#d8eee6" />
        <Block position={[x, 7.1, 0.12]} size={[0.45, 0.09, 0.03]} color="#d8eee6" />
      </group>)}
    </group>}
  </group>
}

function FinishLine({ travel }: { travel: { current: number } }) {
  const group = useRef<Group>(null)
  useFrame(() => {
    if (!group.current) return
    const remaining = RACE_DISTANCE - travel.current
    group.current.visible = remaining < 290
    group.current.position.set(roadX(RACE_DISTANCE) - roadX(travel.current), 0, -remaining)
  })
  return <group ref={group} visible={false}>
    {[-6.4, 6.4].map(x => <Block key={x} position={[x, 3, 0]} size={[0.3, 6, 0.3]} color="#edfa68" />)}
    {Array.from({ length: 24 }, (_, i) => {
      const column = i % 12
      const row = Math.floor(i / 12)
      const color = (column + row) % 2 === 0 ? '#ffffff' : '#111111'
      return <group key={i}>
        <Block position={[column - 5.5, 0.045, row - 0.5]} size={[1, 0.04, 1]} color={color} />
        <Block position={[column - 5.5, 5.5 + row * 0.5, 0]} size={[1, 0.5, 0.2]} color={color} />
      </group>
    })}
  </group>
}

export function World({ travel }: { travel: { current: number } }) {
  return <>
    <FinishLine travel={travel} />
    <color attach="background" args={['#30465e']} />
    <fog attach="fog" args={['#30465e', 90, 290]} />
    <ambientLight intensity={1.4} />
    <hemisphereLight args={['#98cfff', '#322d40', 1.6]} />
    <directionalLight position={[-20, 40, 10]} intensity={2.5} color="#ffe2c4" />
    <Block position={[0, -0.5, -180]} size={[700, 0.1, 700]} color="#142c40" />
    {Array.from({ length: 8 }, (_, index) => <Segment key={index} index={index} travel={travel} />)}
  </>
}

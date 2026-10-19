import { Box, RoundedBox } from "@react-three/drei";
import { BufferGeometry, Float32BufferAttribute } from "three";

// A tapered cabin gives the windshield and rear window their sloped silhouette.
const cabin = new BufferGeometry();
cabin.setAttribute(
  "position",
  new Float32BufferAttribute(
    [
      -0.74, 0.83, -0.85, 0.74, 0.83, -0.85, -0.74, 0.83, 1.03, 0.74, 0.83,
      1.03, -0.6, 1.43, -0.3, 0.6, 1.43, -0.3, -0.6, 1.43, 0.57, 0.6, 1.43,
      0.57,
    ],
    3,
  ),
);
cabin.setIndex([
  0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3, 4, 6,
  7, 4, 7, 5, 0, 1, 3, 0, 3, 2,
]);
cabin.computeVertexNormals();

export function Car({
  color = "#edfa68",
  sport = false,
}: {
  color?: string;
  sport?: boolean;
}) {
  return (
    <group>
      {/* Front faces negative Z. Keep the body within the collision footprint. */}
      <RoundedBox
        args={[1.72, 0.48, 3.5]}
        radius={0.13}
        smoothness={2}
        position={[0, 0.62, 0]}
      >
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.28} />
      </RoundedBox>
      <Box args={[1.55, 0.13, 3.32]} position={[0, 0.32, 0]}>
        <meshStandardMaterial color="#141c26" />
      </Box>
      <RoundedBox
        args={[1.58, 0.12, 0.98]}
        radius={0.04}
        smoothness={2}
        position={[0, 0.87, -1.17]}
      >
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </RoundedBox>
      <mesh geometry={cabin}>
        <meshStandardMaterial
          color="#234653"
          metalness={0.75}
          roughness={0.16}
          flatShading
        />
      </mesh>
      <RoundedBox
        args={[1.27, 0.09, 0.94]}
        radius={0.04}
        smoothness={2}
        position={[0, 1.46, 0.14]}
      >
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* Window pillars, side mirrors, door handles and rocker panels. */}
          <Box
            args={[0.06, 0.59, 0.07]}
            position={[side * 0.68, 1.13, 0.22]}
            rotation={[0, 0, side * 0.22]}
          >
            <meshStandardMaterial color="#19212b" />
          </Box>
          <Box
            args={[0.07, 0.78, 0.07]}
            position={[side * 0.67, 1.13, -0.57]}
            rotation={[-0.74, 0, side * 0.17]}
          >
            <meshStandardMaterial color={color} />
          </Box>
          <Box
            args={[0.07, 0.75, 0.07]}
            position={[side * 0.67, 1.13, 0.8]}
            rotation={[0.66, 0, side * 0.17]}
          >
            <meshStandardMaterial color={color} />
          </Box>
          <RoundedBox
            args={[0.24, 0.14, 0.28]}
            radius={0.04}
            smoothness={2}
            position={[side * 0.88, 0.98, -0.55]}
          >
            <meshStandardMaterial color={color} />
          </RoundedBox>
          <Box
            args={[0.025, 0.045, 0.19]}
            position={[side * 0.865, 0.77, 0.35]}
          >
            <meshStandardMaterial
              color="#c5d0d4"
              metalness={0.8}
              roughness={0.2}
            />
          </Box>
          <Box args={[0.07, 0.12, 1.65]} position={[side * 0.86, 0.35, 0]}>
            <meshStandardMaterial color={sport ? color : "#24303a"} />
          </Box>
          {[-1.08, 1.08].map((z) => (
            <group
              key={z}
              position={[side * 0.85, 0.38, z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <mesh>
                <cylinderGeometry args={[0.37, 0.37, 0.25, 16]} />
                <meshStandardMaterial color="#101419" roughness={0.9} />
              </mesh>
              <mesh position={[0, -side * 0.135, 0]}>
                <cylinderGeometry args={[0.25, 0.25, 0.025, 12]} />
                <meshStandardMaterial
                  color="#aab8c6"
                  metalness={0.8}
                  roughness={0.25}
                />
              </mesh>
              <mesh position={[0, -side * 0.155, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.03, 6]} />
                <meshStandardMaterial color="#253343" />
              </mesh>
            </group>
          ))}
          <Box args={[0.51, 0.12, 0.04]} position={[side * 0.55, 0.72, 1.755]}>
            <meshStandardMaterial
              color="#ff3559"
              emissive="#ff123f"
              emissiveIntensity={2}
            />
          </Box>
          <Box args={[0.49, 0.13, 0.04]} position={[side * 0.55, 0.73, -1.755]}>
            <meshStandardMaterial
              color="#fff5d2"
              emissive="#fff5d2"
              emissiveIntensity={2}
            />
          </Box>
          <mesh
            position={[side * 0.58, 0.35, 1.73]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.09, 0.09, 0.16, 10]} />
            <meshStandardMaterial
              color="#84909b"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
      <Box args={[0.75, 0.17, 0.04]} position={[0, 0.48, -1.755]}>
        <meshStandardMaterial color="#101821" />
      </Box>
      <Box args={[1.42, 0.13, 0.08]} position={[0, 0.39, 1.72]}>
        <meshStandardMaterial color="#15202b" />
      </Box>
      <Box args={[0.36, 0.13, 0.025]} position={[0, 0.61, 1.77]}>
        <meshStandardMaterial color="#e4e9df" />
      </Box>
      {sport && (
        <group>
          {[-0.55, 0.55].map((x) => (
            <Box key={x} args={[0.07, 0.22, 0.12]} position={[x, 1.01, 1.43]}>
              <meshStandardMaterial color="#1b2430" />
            </Box>
          ))}
          <RoundedBox
            args={[1.8, 0.08, 0.3]}
            radius={0.03}
            smoothness={2}
            position={[0, 1.14, 1.43]}
          >
            <meshStandardMaterial color="#26333d" />
          </RoundedBox>
          {[-0.27, 0.27].map((x) => (
            <Box
              key={x}
              args={[0.13, 0.012, 0.82]}
              position={[x, 0.937, -1.19]}
            >
              <meshStandardMaterial color="#26333d" />
            </Box>
          ))}
        </group>
      )}
    </group>
  );
}

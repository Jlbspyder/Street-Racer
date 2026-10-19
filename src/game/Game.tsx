import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils, PerspectiveCamera, Vector3 } from "three";
import { Car } from "./Car";
import { World } from "./World";
import { useGame } from "./store";
import { RACE_DISTANCE, roadX, roadSlope, roadCurvature } from "./route";

const trafficColors = ["#f09370", "#7ba7bd", "#dcd4c0", "#9082ba", "#65b6aa"];

export function Game() {
  const runCar = useGame(state => state.runCar);
  const duration = useRef(0);
  const maxSpeed = useRef(0);
  const boostsUsed = useRef(0);
  const wasBoosting = useRef(false);
  const player = useRef<Group>(null);
  const trafficGroups = useRef<(Group | null)[]>([]);
  const keys = useRef(new Set<string>());
  const travel = useRef(0);
  const speed = useRef(0);
  const x = useRef(0);
  const boost = useRef(100);
  const elapsed = useRef(0);
  const impact = useRef(0);
  const saveElapsed = useRef(0);
  
  const traffic = useRef(
    Array.from({ length: 10 }, (_, i) => ({
      x: (((i * 2) % 3) - 1) * 4,
      z: -65 - i * 36,
      speed: 17 + (i % 4) * 3,
    })),
  );
  const cameraTarget = useRef(new Vector3());

  useEffect(() => {
    const controls = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
    ];
    function down(event: KeyboardEvent) {
      if (controls.includes(event.code)) {
        event.preventDefault();
        keys.current.add(event.code);
      }
      if (event.code === "Escape" && !event.repeat) useGame.getState().pause();
    }
    function up(event: KeyboardEvent) {
      keys.current.delete(event.code);
    }
    function blur() {
      keys.current.clear();
      if (useGame.getState().status === "playing") useGame.getState().pause();
    }
    function visibility() { if (document.hidden) blur(); }
    const saveBest = () => useGame.getState().saveBest();
    const unsubscribe = useGame.subscribe((state) => {
      if (state.status !== 'playing') keys.current.clear();
    });
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener("pagehide", saveBest);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      saveBest();
      unsubscribe();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener("pagehide", saveBest);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const playing = useGame.getState().status === "playing";
    const held = (...codes: string[]) =>
      codes.some((code) => keys.current.has(code));
    const touch = useGame.getState().controls;
    let steering = 0;
    if (playing) {
      duration.current += dt;
      impact.current = Math.max(0, impact.current - dt);
      const braking = held("KeyS", "ArrowDown") || touch.brake;
      const accelerating = held("KeyW", "ArrowUp") || touch.accelerate;
      const boosting =
        (held("Space") || touch.nitro) && boost.current > 0 && accelerating && !braking;
      if (boosting && !wasBoosting.current) boostsUsed.current++;
      wasBoosting.current = boosting;
      const normalLimit = (runCar?.topSpeed ?? 201.6) / 3.6;
      const boostedLimit = normalLimit + 20;
      const limit = boosting ? boostedLimit : normalLimit;
      speed.current = MathUtils.clamp(
        speed.current + (braking ? -40 : accelerating ? (runCar?.acceleration ?? 19) : -7) * dt,
        0,
        boostedLimit,
      );
      if (speed.current > limit)
        speed.current = Math.max(limit, speed.current - 18 * dt);
      maxSpeed.current = Math.max(maxSpeed.current, speed.current * 3.6);
      boost.current = MathUtils.clamp(
        boost.current + (boosting ? -30 : 12) * dt,
        0,
        100,
      );
      steering =
        Number(held("KeyD", "ArrowRight") || touch.right) - Number(held("KeyA", "ArrowLeft") || touch.left);
      x.current += steering * MathUtils.clamp(speed.current / 6, 2.5, runCar?.handling ?? 8) * dt;
      // Bends gently push the car outward; steer into them to hold your lane.
      x.current -= roadCurvature(travel.current) * speed.current ** 2 * 0.22 * dt;
      travel.current = Math.min(RACE_DISTANCE, travel.current + speed.current * dt);
      let contact = Math.abs(x.current) > 5.05;
      x.current = MathUtils.clamp(x.current, -5.05, 5.05);
      for (const car of traffic.current) {
        const previousZ = car.z;
        car.z += (speed.current - car.speed) * dt;
        if (
          Math.abs(car.x - x.current) < 1.8 &&
          Math.min(previousZ, car.z) < 3.6 &&
          Math.max(previousZ, car.z) > -3.6
        ) {
          contact = true;
          const sideOverlap = 1.8 - Math.abs(x.current - car.x);
          const frontOverlap = 3.6 - Math.abs(car.z);
          if (sideOverlap < frontOverlap) {
            // Separate a side scrape, leaving the driver free to steer away.
            const direction = x.current >= car.x ? 1 : -1;
            x.current = MathUtils.clamp(car.x + direction * 1.8, -5.05, 5.05);
            // At the curb there may be no lateral space; separate along the road.
            if (Math.abs(x.current - car.x) < 1.8)
              car.z = previousZ <= 0 ? -3.6 : 3.6;
          } else {
            car.z = previousZ <= 0 ? -3.6 : 3.6;
          }
          if (car.z < 0) speed.current = Math.min(speed.current, car.speed);
        }
        if (car.z > 24 || car.z < -430) {
          // Place recycled cars beyond the furthest vehicle, leaving a safe gap.
          car.z =
            Math.min(-180, ...traffic.current.map((other) => other.z)) -
            Math.max(23, 42 - travel.current / 250);
          car.x = (Math.floor(Math.random() * 3) - 1) * 4;
        }
      }
      // A short cooldown prevents a scrape from triggering an impact every frame.
      const hit = contact && impact.current === 0;
      if (hit) {
        speed.current *= 0.65;
        impact.current = 0.65;
        useGame.setState((state) => ({ impacts: state.impacts + 1 }));
      }
      elapsed.current += dt;
      const reachedFinish = travel.current >= RACE_DISTANCE;
      if (elapsed.current > 0.1 || hit || reachedFinish) {
        useGame.setState({
          speed: speed.current * 3.6,
          distance: travel.current,
          duration: duration.current,
          maxSpeed: maxSpeed.current,
          boostsUsed: boostsUsed.current,
          lateral: x.current,
          score: Math.floor(travel.current * 10),
          best: Math.max(
            useGame.getState().best,
            Math.floor(travel.current * 10),
          ),
          boost: boost.current,
        });
        elapsed.current = 0;
      }
      if (reachedFinish) useGame.getState().finish();
      saveElapsed.current += dt;
      if (saveElapsed.current >= 2) {
        useGame.getState().saveBest();
        saveElapsed.current = 0;
      }
    }
    if (player.current) {
      player.current.position.x = x.current;
      player.current.rotation.z = MathUtils.damp(
        player.current.rotation.z,
        -steering * 0.06,
        8,
        dt,
      );
      player.current.rotation.y = MathUtils.damp(
        player.current.rotation.y,
        -Math.atan(roadSlope(travel.current)) - steering * 0.1,
        8,
        dt,
      );
    }
    traffic.current.forEach((car, i) => {
      const group = trafficGroups.current[i];
      if (!group) return;
      const distance = travel.current - car.z;
      group.position.set(roadX(distance) - roadX(travel.current) + car.x, 0, car.z);
      group.rotation.y = -Math.atan(roadSlope(distance));
    });
    cameraTarget.current.set(
      roadX(travel.current - 12) - roadX(travel.current) + x.current * 0.45,
      4.5 + speed.current * 0.012,
      10 + speed.current * 0.025,
    );
    camera.position.lerp(cameraTarget.current, 1 - Math.exp(-5 * dt));
    camera.lookAt(roadX(travel.current + 28) - roadX(travel.current) + x.current * 0.25, 1, -28);
    if (playing && impact.current > 0) {
      camera.rotation.z +=
        Math.sin(impact.current * 55) * impact.current * 0.025;
    }
    if (camera instanceof PerspectiveCamera) {
      camera.fov = MathUtils.damp(camera.fov, 58 + speed.current * 0.18, 3, dt);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <>
      <World travel={travel} />
      <group ref={player}>
        <Car sport color={runCar?.key === "vortex" ? "#65b6aa" : runCar?.key === "falcon" ? "#f09370" : runCar?.key === "night-runner" ? "#9082ba" : "#edfa68"} />
      </group>
      {Array.from({ length: 10 }, (_, i) => (
        <group
          key={i}
          ref={(group) => {
            trafficGroups.current[i] = group;
          }}
        >
          <Car color={trafficColors[i % trafficColors.length]} />
        </group>
      ))}
    </>
  );
}



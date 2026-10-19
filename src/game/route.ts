export const RACE_DISTANCE = 5000

// One smooth, repeating route shared by the road, traffic, camera and map.
export const ROUTE_LENGTH = 640;
const TURN = (Math.PI * 2) / ROUTE_LENGTH;

export function roadX(distance: number) {
  return 34 * Math.sin(distance * TURN) - 17 * Math.sin(distance * TURN * 2);
}

export function roadSlope(distance: number) {
  return (
    34 * TURN * Math.cos(distance * TURN) -
    34 * TURN * Math.cos(distance * TURN * 2)
  );
}

export function roadCurvature(distance: number) {
  return (
    -34 * TURN * TURN * Math.sin(distance * TURN) +
    68 * TURN * TURN * Math.sin(distance * TURN * 2)
  );
}

export function segmentZ(index: number, distance: number) {
  // Eight sections cover the road ahead, with one section behind the camera.
  return (
    ((((distance - index * 80 + 520) % ROUTE_LENGTH) + ROUTE_LENGTH) %
      ROUTE_LENGTH) -
    520
  );
}

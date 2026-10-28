import type { ConflictEvent } from "../types/conflict";

export type MapBounds = [
  west: number,
  south: number,
  east: number,
  north: number,
];
const wrapLongitude = (value: number) =>
  ((((value + 180) % 360) + 360) % 360) - 180;

export function withinBounds(
  coordinates: [number, number],
  bounds: MapBounds,
): boolean {
  const [lng, lat] = coordinates;
  const [west, south, east, north] = bounds;
  if (
    ![...coordinates, ...bounds].every(Number.isFinite) ||
    south > north ||
    lat < south ||
    lat > north
  )
    return false;
  if (east - west >= 360) return true;
  const left = wrapLongitude(west);
  const right = wrapLongitude(east);
  const longitude = wrapLongitude(lng);
  return left <= right
    ? longitude >= left && longitude <= right
    : longitude >= left || longitude <= right;
}

export function eventsInView(
  events: ConflictEvent[],
  bounds: MapBounds | null,
): ConflictEvent[] {
  return bounds
    ? events.filter((event) => withinBounds(event.coordinates, bounds))
    : events;
}

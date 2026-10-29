import type { ConflictEvent, EventKind, Region } from "../types/conflict";

export function filterEvents(
  events: ConflictEvent[],
  filters: {
    search: string;
    region: Region;
    kinds: EventKind[];
    hours?: number;
    now: number;
    militaryOnly?: boolean;
    interstateOnly?: boolean;
    stateOnly?: boolean;
    country?: string;
    pair?: string;
    economicOnly?: boolean;
  },
) {
  const search = filters.search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return events.filter((event) => {
    const text = [
      event.title,
      event.location,
      event.economy?.label ?? "",
      ...event.actors,
      ...event.countries.map((country) => country.name),
    ]
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const age = filters.now - Date.parse(event.reportedAt);
    return (
      (!filters.militaryOnly || event.military) &&
      (!filters.economicOnly || !!event.economy) &&
      (!filters.interstateOnly || !!event.countryPair) &&
      (!filters.stateOnly || event.stateLinked) &&
      (!filters.country ||
        event.countries.some((country) => country.code === filters.country)) &&
      (!filters.pair || event.countryPair === filters.pair) &&
      (!search || text.includes(search)) &&
      (filters.region === "Todas as regiões" ||
        event.region === filters.region) &&
      filters.kinds.includes(event.kind) &&
      (event.demo ||
        filters.hours === undefined ||
        (age >= -900000 && age <= filters.hours * 3600000))
    );
  });
}

export function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function regionFromCoordinates(lng: number, lat: number): Region {
  if (lng < -25) return "Américas";
  if (lng >= 26 && lng <= 64 && lat >= 12 && lat <= 42) return "Oriente Médio";
  if (lng >= -20 && lng <= 55 && lat < 37) return "África";
  if (lng < 65 && lat >= 35) return "Europa";
  return "Ásia e Pacífico";
}

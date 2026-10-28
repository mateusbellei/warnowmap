import type { ConflictEvent } from "../types/conflict";

export function calendarDays(from: string, to: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
    return [];
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    end - start > 89 * 86400000
  )
    return [];
  if (
    new Date(start).toISOString().slice(0, 10) !== from ||
    new Date(end).toISOString().slice(0, 10) !== to
  )
    return [];
  return Array.from(
    { length: Math.round((end - start) / 86400000) + 1 },
    (_, index) => new Date(start + index * 86400000).toISOString().slice(0, 10),
  );
}

export function mergeHistory(
  previous: ConflictEvent[],
  incoming: ConflictEvent[],
  now: number,
  retentionDays = 7,
) {
  const cutoff = now - retentionDays * 86400000;
  const events = new Map<string, ConflictEvent>();
  for (const event of [...previous, ...incoming]) {
    const time = Date.parse(event.reportedAt);
    if (!event.demo && time >= cutoff && time <= now + 900000)
      events.set(event.id, event);
  }
  const grouped = new Map<string, ConflictEvent>();
  for (const event of events.values()) {
    const key = [
      event.sourceUrl,
      event.coordinates.join(","),
      event.kind,
      event.eventDate,
      event.countryPair ??
        event.countries
          .map((country) => country.code)
          .sort()
          .join(":"),
      event.actionCode,
    ].join("|");
    const previous = grouped.get(key);
    if (!previous) grouped.set(key, { ...event, actors: [...event.actors] });
    else {
      previous.actors = [...new Set([...previous.actors, ...event.actors])];
      previous.stateLinked ||= event.stateLinked;
      previous.military ||= event.military;
      previous.mentions = Math.max(previous.mentions, event.mentions);
      if (event.reportedAt > previous.reportedAt)
        previous.reportedAt = event.reportedAt;
    }
  }
  return [...grouped.values()]
    .sort(
      (a, b) =>
        b.reportedAt.localeCompare(a.reportedAt) || a.id.localeCompare(b.id),
    )
    .slice(0, 15000);
}

export function sortTimeline(
  events: ConflictEvent[],
  basis: "event" | "collected",
  order: "asc" | "desc",
) {
  return [...events].sort((a, b) => {
    const left = basis === "event" ? a.eventDate : a.reportedAt;
    const right = basis === "event" ? b.eventDate : b.reportedAt;
    return (
      (order === "asc" ? 1 : -1) *
      (left.localeCompare(right) ||
        a.reportedAt.localeCompare(b.reportedAt) ||
        a.id.localeCompare(b.id))
    );
  });
}
export function timelineDays(
  events: ConflictEvent[],
  basis: "event" | "collected",
) {
  const counts = new Map<string, number>();
  for (const event of events) {
    const date =
      basis === "event" ? event.eventDate : event.reportedAt.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
export function groupTimeline(
  events: ConflictEvent[],
  basis: "event" | "collected",
) {
  const groups = new Map<string, ConflictEvent[]>();
  for (const event of events) {
    const date =
      basis === "event" ? event.eventDate : event.reportedAt.slice(0, 10);
    const entries = groups.get(date) ?? [];
    entries.push(event);
    groups.set(date, entries);
  }
  return [...groups].map(([date, events]) => ({ date, events }));
}

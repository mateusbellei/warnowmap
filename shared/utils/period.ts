import type { ConflictEvent } from "../types/conflict";
export type DateBasis = "event" | "collected";
export function validDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function defaultMonth(end: string) {
  return {
    from: new Date(Date.parse(end + "T12:00:00Z") - 29 * 86400000)
      .toISOString()
      .slice(0, 10),
    to: end,
  };
}
export function validPeriod(from: string, to: string) {
  return (
    validDay(from) &&
    validDay(to) &&
    from <= to &&
    Date.parse(to) - Date.parse(from) <= 89 * 86400000
  );
}
export function eventsInPeriod(
  events: ConflictEvent[],
  from: string,
  to: string,
  basis: DateBasis,
  hours?: number | null,
  now = Date.now(),
) {
  if (!validPeriod(from, to)) return [];
  return events.filter((event) => {
    const date =
      basis === "event" ? event.eventDate : event.reportedAt.slice(0, 10);
    if (date < from || date > to) return false;
    if (!hours || event.demo) return true;
    const age = now - Date.parse(event.reportedAt);
    return age >= -900000 && age <= hours * 3600000;
  });
}

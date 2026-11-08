import type { EventFeed } from "../types/conflict";
import { calendarDays } from "./timeline";
export function feedCoverage(
  feed: EventFeed | null | undefined,
  from: string,
  to: string,
  now = Date.now(),
) {
  const days = calendarDays(from, to).filter(
    (day) => Date.parse(day + "T00:00:00Z") <= now,
  );
  const valid = (date: string) =>
    Number.isFinite(Date.parse(date)) && Date.parse(date) <= now;
  const batches = [
    ...new Set(
      (feed?.coverage?.contextBatchDates ?? [])
        .filter(valid)
        .map((date) =>
          new Date(
            Math.floor(Date.parse(date) / 900000) * 900000,
          ).toISOString(),
        ),
    ),
  ].filter((date) => days.includes(date.slice(0, 10)));
  const withRecords = new Set(batches.map((date) => date.slice(0, 10)));
  const expected = days.reduce(
    (total, day) =>
      total +
      Math.max(
        0,
        Math.min(
          96,
          Math.floor((now - Date.parse(day + "T00:00:00Z")) / 900000),
        ),
      ),
    0,
  );
  const last =
    [
      feed?.operation?.lastSuccessAt,
      feed?.coverage?.lastCollectedAt,
      feed?.fetchedAt,
    ].find((date) => date && valid(date)) ?? null;
  const minutes = last
    ? Math.max(0, Math.floor((now - Date.parse(last)) / 60000))
    : null;
  const gaps = Math.max(0, days.length - withRecords.size);
  const partial =
    !batches.length ||
    batches.length < expected ||
    feed?.coverage?.contextStatus === "partial";
  const temporary =
    feed?.coverage?.persistence === "ephemeral" ||
    feed?.operation?.repository === "temporary";
  const state = !feed
    ? "waiting"
    : feed.mode === "demo"
      ? "demo"
      : feed.mode === "unavailable"
        ? "unavailable"
        : minutes === null
          ? "unknown"
          : feed.mode === "stale" || minutes > 60
            ? "stale"
            : "recent";
  return {
    last,
    minutes,
    days: days.length,
    withRecords: withRecords.size,
    gaps,
    batches: batches.length,
    expected,
    partial,
    temporary,
    state,
  };
}

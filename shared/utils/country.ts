import type {
  CountryMetric,
  MetricPoint,
  CountryObservation,
} from "../types/country";
import type { EventFeed, ConflictEvent } from "../types/conflict";
import { canonicalArticleUrl } from "./occurrences";
import { groupStories } from "./stories";
import { calendarDays } from "./timeline";
export function countryDailyActivity(
  events: ConflictEvent[],
  code: string,
  from: string,
  to: string,
  basis: "event" | "collected",
) {
  const counts = new Map<string, number>();
  for (const story of groupStories(events))
    if (story.countries.some((country) => country.code === code)) {
      const day =
        basis === "collected" ? story.reportedAt.slice(0, 10) : story.eventDate;
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  return calendarDays(from, to).map((day) => ({
    day,
    count: counts.get(day) ?? 0,
  }));
}
export function latestMetric(metric?: CountryMetric): MetricPoint | null {
  return (
    metric?.points.filter((point) => Number.isFinite(point.value)).at(-1) ??
    null
  );
}
export function metricText(value: number, unit: string) {
  if (unit === "people")
    return new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  if (unit === "usd")
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  return (
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value) +
    (unit === "percent" ? "%" : unit === "score" ? " / 100" : "")
  );
}
export function stabilityColor(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "#596771";
  return value >= 75
    ? "#75c6b0"
    : value >= 60
      ? "#aad0bd"
      : value >= 45
        ? "#e2c477"
        : value >= 30
          ? "#e89b70"
          : "#d86d70";
}
export function countryActivity(events: ConflictEvent[], code: string) {
  const related = events.filter((event) =>
    event.countries.some((country) => country.code === code),
  );
  const stories = groupStories(related);
  return {
    publications: new Set(
      related.flatMap(
        (event) =>
          event.reports?.map(
            (report) => canonicalArticleUrl(report.url) ?? report.url,
          ) ?? [canonicalArticleUrl(event.sourceUrl) ?? event.sourceUrl],
      ),
    ).size,
    stories: stories.length,
    conflict: stories.filter(
      (event) => event.kind === "armed" || event.kind === "violence",
    ).length,
    tension: stories.filter((event) => event.kind === "tension").length,
    diplomacy: stories.filter((event) => event.kind === "diplomacy").length,
    economy: stories.filter((event) => event.economy).length,
  };
}
export function observeCountries(
  feed: EventFeed,
  observedAt: string,
): CountryObservation[] {
  const now = Date.parse(observedAt),
    cutoff = now - 7 * 86400000;
  const events = feed.events.filter(
    (event) =>
      !event.demo &&
      Date.parse(event.reportedAt) >= cutoff &&
      Date.parse(event.reportedAt) <= now + 900000,
  );
  const batches = new Set(
    (feed.coverage?.contextBatchDates ?? []).filter(
      (date) => Date.parse(date) >= cutoff && Date.parse(date) <= now,
    ),
  );
  return [
    ...new Set(
      events.flatMap((event) => event.countries.map((country) => country.code)),
    ),
  ].map((code) => ({
    code,
    day: observedAt.slice(0, 10),
    observedAt,
    ...countryActivity(events, code),
    coverage: Math.min(1, batches.size / (7 * 96)),
    methodology: "news-observation-v1",
  }));
}

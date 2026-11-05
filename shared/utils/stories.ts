import type { ConflictEvent } from "../types/conflict";
import { groupOccurrences, canonicalArticleUrl, stableId } from "./occurrences";
const tokens = (title: string) =>
  title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[\p{L}]{3,}/gu)
    ?.filter(
      (word) =>
        ![
          "the",
          "and",
          "for",
          "with",
          "from",
          "says",
          "said",
          "say",
          "report",
          "reports",
          "reported",
          "official",
          "officials",
          "after",
          "over",
          "that",
          "this",
        ].includes(word),
    ) ?? [];
/** Cobertura editorial relacionada; não identifica incidentes confirmados. */
export function groupStories(events: ConflictEvent[]): ConflictEvent[] {
  const buckets = new Map<string, ConflictEvent[]>();
  for (const event of groupOccurrences(events)) {
    const core = tokens(event.title);
    const key =
      core.length >= 7
        ? [
            event.kind,
            event.eventDate,
            event.countries
              .map((c) => c.code)
              .sort()
              .join(","),
            (event.title.match(/\d+/g) ?? []).join(","),
            core.join(" "),
          ].join("|")
        : event.id;
    const group = buckets.get(key) ?? [];
    group.push(event);
    buckets.set(key, group);
  }
  const groups = [...buckets.values()];
  return groups
    .map((items) => {
      const primary = [...items].sort((a, b) =>
        b.reportedAt.localeCompare(a.reportedAt),
      )[0]!;
      const reports = [
        ...new Map(
          items
            .flatMap((item) => item.reports ?? [])
            .map((report) => [
              canonicalArticleUrl(report.url) ?? report.url,
              report,
            ]),
        ).values(),
      ].sort(
        (a, b) =>
          a.indexedAt.localeCompare(b.indexedAt) || a.url.localeCompare(b.url),
      );
      const root = reports[0];
      return {
        ...primary,
        id: root
          ? `story-${stableId(canonicalArticleUrl(root.url) ?? root.url)}`
          : primary.id,
        reports,
        reportCount: reports.length,
        groupingBasis:
          items.length > 1
            ? ("related-coverage" as const)
            : primary.groupingBasis,
        story: {
          updatedAt: reports.at(-1)?.indexedAt ?? primary.reportedAt,
          sourceCount: new Set(
            reports.map((report) =>
              new URL(report.url).hostname.replace(/^www\./, ""),
            ),
          ).size,
        },
      };
    })
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}
export function feedFingerprint(events: ConflictEvent[]): string {
  return events
    .map((event) =>
      [
        event.id,
        event.title,
        event.kind,
        event.eventDate,
        event.countries
          .map((country) => country.code)
          .sort()
          .join(","),
        event.coordinates.join(","),
        event.economy?.label,
        event.reportCount,
        ...(event.reports ?? [])
          .map((report) => report.url + report.title)
          .sort(),
      ].join("|"),
    )
    .sort()
    .join("\n");
}
export function changedStories(
  before: ConflictEvent[],
  after: ConflictEvent[],
) {
  const previous = new Map(
    before.map((event) => [event.id, feedFingerprint([event])]),
  );
  return after.filter(
    (event) => previous.get(event.id) !== feedFingerprint([event]),
  ).length;
}

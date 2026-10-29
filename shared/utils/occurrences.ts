import type { ConflictEvent, SourceReport } from "../types/conflict";
import { safeSourceUrl } from "./events";
import { economicEvidence } from "./economy";

export function stableId(text: string): string {
  let a = 2166136261,
    b = 5381;
  for (const char of text) {
    a = Math.imul(a ^ char.charCodeAt(0), 16777619);
    b = Math.imul(b, 33) ^ char.charCodeAt(0);
  }
  return `${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`;
}
export function canonicalArticleUrl(value: string): string | null {
  const safe = safeSourceUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (
      /^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key) ||
      (/\/liveblog\/|\/live-updates\//i.test(url.pathname) && key === "update")
    )
      url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href;
}
const normalizeTitle = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function classifyNarrative(event: ConflictEvent) {
  const text = event.title.toLowerCase();
  const situation: NonNullable<ConflictEvent["situation"]> =
    /\b(denies|denied|rejects|disputes|nega|desmente|contesta)\b/.test(text)
      ? "contested"
      : /\b(threat\w*|plans? to|consider\w*|ameac\w*|pretende)\b/.test(text)
        ? "threatened"
        : /\b(agreement signed|signs? (a |the )?(peace |ceasefire )?(deal|agreement)|acordo assinado)\b/.test(
              text,
            )
          ? "agreement"
          : /talk|negoti|mediat|mediac|pourparlers/i.test(text)
            ? "negotiation"
            : /\b(announc\w*|anuncia\w*)\b/.test(text)
              ? "announced"
              : "reported";
  const contentType: NonNullable<ConflictEvent["contentType"]> =
    /\/liveblog\/|\/live-updates\//.test(event.sourceUrl)
      ? "liveblog"
      : /\b(opinion|editorial|analysis|commentary|op-ed|on point)\b/i.test(
            event.title + " " + new URL(event.sourceUrl).pathname,
          )
        ? "analysis"
        : "news";
  const codes = event.countries.map((c) => c.code).sort();
  return {
    situation,
    contentType,
    dossier: {
      id: `context-${codes.join("-") || "unknown"}`,
      label:
        [...event.countries]
          .sort((a, b) => a.code.localeCompare(b.code))
          .map((c) => c.name)
          .join(" · ") || "Contexto não identificado",
      basis: "mentioned-countries" as const,
    },
  };
}

// Correspondência conservadora de publicações; não confirma identidade factual nem independência editorial.
export function groupOccurrences(input: ConflictEvent[]): ConflictEvent[] {
  const groups = new Map<string, ConflictEvent[]>();
  const byUrl = new Map<string, string>();
  for (const event of [...input].sort(
    (a, b) =>
      a.reportedAt.localeCompare(b.reportedAt) || a.id.localeCompare(b.id),
  )) {
    const url = canonicalArticleUrl(event.sourceUrl);
    if (!url) continue;
    const live = /\/liveblog\/|\/live-updates\//i.test(url);
    const headline = normalizeTitle(event.title);
    const titleKey = `${event.eventDate}|${event.kind}|${event.countries
      .map((c) => c.code)
      .sort()
      .join(":")}|${headline}`;
    const key =
      byUrl.get(url) ??
      (live || headline.length < 35 ? `url:${url}` : `headline:${titleKey}`);
    byUrl.set(url, key);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, events]) => {
      const ordered = [...events].sort(
        (a, b) =>
          b.reportedAt.localeCompare(a.reportedAt) || a.id.localeCompare(b.id),
      );
      const primary = ordered[0]!;
      const reports = [
        ...new Map(
          ordered
            .flatMap(
              (event) =>
                event.reports ?? [
                  {
                    id: event.id,
                    title: event.title,
                    url: event.sourceUrl,
                    source: event.source,
                    indexedAt: event.reportedAt,
                    date: event.eventDate,
                    dateBasis: event.dateBasis,
                  } satisfies SourceReport,
                ],
            )
            .map((report) => [report.url, report]),
        ).values(),
      ];
      const urls = new Set(
        reports.map((report) => canonicalArticleUrl(report.url)),
      );
      return {
        ...primary,
        ...classifyNarrative(primary),
        economy: economicEvidence(primary),
        id: primary.demo ? primary.id : `occ-${stableId(key)}`,
        reports,
        reportCount: reports.length,
        groupingBasis:
          urls.size === 1
            ? ("canonical-url" as const)
            : ("matching-headline" as const),
        firstSeenAt: events[0]!.firstSeenAt ?? events[0]!.reportedAt,
        lastSeenAt: primary.lastSeenAt ?? primary.reportedAt,
      };
    })
    .sort(
      (a, b) =>
        b.reportedAt.localeCompare(a.reportedAt) || a.id.localeCompare(b.id),
    );
}

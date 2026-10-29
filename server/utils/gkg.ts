import { strFromU8, unzipSync } from "fflate";
import type { ConflictEvent } from "../../shared/types/conflict";
import { safeSourceUrl } from "../../shared/utils/events";
import { regionFromCoordinates } from "../../shared/utils/events";
import { parseGdeltDate } from "./gdelt";
import { articleTopic } from "./news-topics";
import { headlineCountries, countryReference } from "./headline-countries";
import { cleanHeadline } from "./headline";

export function pageHeadline(xml: string): string | undefined {
  const raw = /<PAGE_TITLE>([\s\S]*?)<\/PAGE_TITLE>/.exec(xml)?.[1];
  if (!raw) return undefined;
  const entities: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
  };
  return (
    raw
      .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
      .replace(
        /&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,
        (whole, entity: string) => {
          if (!entity.startsWith("#"))
            return entities[entity.toLowerCase()] ?? whole;
          const code =
            entity[1]?.toLowerCase() === "x"
              ? parseInt(entity.slice(2), 16)
              : parseInt(entity.slice(1), 10);
          return code > 0 &&
            code <= 0x10ffff &&
            !(code >= 0xd800 && code <= 0xdfff)
            ? String.fromCodePoint(code)
            : "�";
        },
      )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400) || undefined
  );
}

export function articleKey(value: string): string | null {
  const safe = safeSourceUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  url.hash = "";
  return url.href;
}

export function decodeGkg(bytes: Uint8Array): string {
  if (bytes.byteLength > 10_000_000)
    throw new Error("GKG comprimido muito grande");
  let expanded = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      if (
        !/\.gkg\.csv$/i.test(file.name) ||
        file.originalSize + expanded >= 64_000_000
      )
        return false;
      expanded += file.originalSize;
      return true;
    },
  });
  const file = Object.values(files)[0];
  if (!file) throw new Error("GKG ausente ou muito grande");
  return strFromU8(file);
}

export function articleContexts(text: string, events: ConflictEvent[]) {
  const wanted = new Set(events.map((event) => articleKey(event.sourceUrl)));
  const contexts = new Map<
    string,
    NonNullable<ConflictEvent["articleContext"]>
  >();
  // Só copiamos temas da mesma URL; citações/links em outro artigo não contam como contexto.
  for (const line of text.split(/\r?\n/)) {
    const row = line.split("\t");
    const key = articleKey(row[4] ?? "");
    if (row.length < 16 || !key || !wanted.has(key)) continue;
    const themes = (row[7] ?? "")
      .split(";")
      .filter((theme) => /^[A-Z0-9_]{1,100}$/.test(theme));
    const previous = contexts.get(key);
    const originalHeadline =
      pageHeadline(row[26] ?? "") ?? previous?.originalHeadline;
    contexts.set(key, {
      headline: originalHeadline
        ? cleanHeadline(originalHeadline, key)
        : previous?.headline,
      originalHeadline,
      themes: [...new Set([...(previous?.themes ?? []), ...themes])].slice(
        0,
        500,
      ),
    });
  }
  return contexts;
}

export function enrichContext(events: ConflictEvent[], text: string) {
  const contexts = articleContexts(text, events);
  return events.map((event) => {
    const articleContext = contexts.get(articleKey(event.sourceUrl) ?? "");
    return {
      ...event,
      articleContext,
      title: articleContext?.headline ?? event.title,
    };
  });
}

export function newsFromGkg(text: string, now = Date.now()): ConflictEvent[] {
  const articles = new Map<string, ConflictEvent>();
  for (const line of text.split(/\r?\n/)) {
    const row = line.split("\t");
    if (row.length < 27) continue;
    const sourceUrl = articleKey(row[4] ?? "");
    const originalHeadline = pageHeadline(row[26] ?? "");
    if (!sourceUrl || !originalHeadline || articles.has(sourceUrl)) continue;
    const title = cleanHeadline(originalHeadline, sourceUrl);
    const themes = (row[7] ?? "")
      .split(";")
      .filter((theme) => /^[A-Z0-9_]{1,100}$/.test(theme))
      .slice(0, 500);
    const topic = articleTopic(title, themes);
    if (!topic) continue;
    const countries = headlineCountries(title);
    const anchor = countryReference(row[9] ?? "", countries);
    if (!anchor) continue;
    const reportedAt = parseGdeltDate((row[1] ?? "").slice(0, 14));
    const pubMatch =
      /<PAGE_PRECISEPUBTIMESTAMP>(\d{14})<\/PAGE_PRECISEPUBTIMESTAMP>/.exec(
        row[26] ?? "",
      );
    const publishedAt = pubMatch ? parseGdeltDate(pubMatch[1]!) : reportedAt;
    if (
      !reportedAt ||
      !publishedAt ||
      Date.parse(publishedAt) < now - 72 * 3600000 ||
      Date.parse(publishedAt) > now + 900000
    )
      continue;
    articles.set(sourceUrl, {
      id: `gkg-${row[0]}`,
      title,
      sourceUrl,
      source: new URL(sourceUrl).hostname.replace(/^www\./, ""),
      sourceType: "article",
      countryBasis: "headline",
      dateBasis: pubMatch ? "publication" : "indexed",
      countries,
      countryPair:
        countries.length === 2
          ? countries
              .map((country) => country.code)
              .sort()
              .join(":")
          : null,
      actors: [],
      participants: [],
      articleContext: { themes, headline: title, originalHeadline },
      kind: topic.kind,
      coordinates: anchor.coordinates,
      location: `${anchor.country.name} · referência de país na manchete`,
      locationPrecision: "country",
      region: regionFromCoordinates(...anchor.coordinates),
      actionCode: "",
      military: false,
      stateLinked: false,
      reportedAt,
      eventDate: publishedAt.slice(0, 10),
      mentions: 0,
      demo: false,
      ...(themes.includes("SANCTIONS") && topic.kind === "tension"
        ? {
            economy: {
              sector: "sanctions" as const,
              status: /threat|propos|consider|ameac|planej/i.test(title)
                ? ("potential" as const)
                : ("reported" as const),
              label: "Sanções mencionadas na manchete",
              context:
                "A fonte noticia sanções ou medidas relacionadas; efeito e valores não quantificados.",
            },
          }
        : {}),
    });
  }
  return [...articles.values()].slice(0, 1000);
}

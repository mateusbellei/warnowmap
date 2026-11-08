import iso from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import type {
  MilitaryDataset,
  MilitaryKey,
  MilitaryValue,
} from "../../shared/types/military";
iso.registerLocale(en);
export const militaryPages = {
  active: "active-military-manpower.php",
  reserve: "active-reserve-military-manpower.php",
  tanks: "armor-tanks-total.php",
  fighters: "aircraft-total-fighters.php",
  attack: "aircraft-total-attack-types.php",
} as const;
const aliases: Record<string, string> = {
  syria: "SYR",
  laos: "LAO",
  moldova: "MDA",
  kosovo: "KSV",
  "democratic-republic-of-the-congo": "COD",
  "republic-of-the-congo": "COG",
  "ivory-coast": "CIV",
  turkey: "TUR",
  turkiye: "TUR",
  "south-korea": "KOR",
  "north-korea": "PRK",
  "united-states-of-america": "USA",
  "czech-republic": "CZE",
  macedonia: "MKD",
  bangaladesh: "BGD",
  beliz: "BLZ",
};
/** Read only published inventory values, never rank, readiness or graph percentages. */
export function parseMilitaryPage(
  html: string,
  key: Exclude<MilitaryKey, "drones">,
) {
  const year = Number(html.match(/<title>[^<]*\b(20\d{2})\b/i)?.[1]);
  if (
    !Number.isInteger(year) ||
    year < 2020 ||
    year > new Date().getUTCFullYear() + 1
  )
    throw Error("MILITARY_INVALID_YEAR");
  const records = new Map<string, MilitaryValue>();
  for (const match of html.matchAll(
    /<a\s[^>]*href=["']\/country-military-strength-detail\.php\?country_id=([a-z-]+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const block = match[2]!;
    const name = block
      .match(/class=["']longFormName["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
      ?.replace(/<[^>]*>/g, " ")
      .trim()
      .replace(/&amp;/g, "&");
    const raw = block
      .match(/class=["']valueContainer["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
      ?.replace(/<[^>]*>/g, " ")
      .trim();
    if (!name || !raw || !/^\d[\d,\s]*$/.test(raw)) continue;
    const value = Number(raw.replace(/[,\s]/g, ""));
    const code = aliases[match[1]!] ?? iso.getAlpha3Code(name, "en");
    if (!code) continue;
    if (!Number.isSafeInteger(value) || value < 0 || value > 150000000)
      throw Error("MILITARY_INVALID_VALUE");
    const canonical = code === "XKK" ? "KSV" : code;
    if (records.has(canonical)) throw Error("MILITARY_DUPLICATE_COUNTRY");
    records.set(canonical, {
      key,
      value,
      year,
      sourceUrl: `https://www.globalfirepower.com/${militaryPages[key]}`,
    });
  }
  return records;
}
export async function fetchMilitaryDataset(): Promise<MilitaryDataset> {
  const countries = new Map<string, MilitaryValue[]>();
  let edition: number | undefined;
  for (const [key, page] of Object.entries(militaryPages)) {
    const response = await fetch(`https://www.globalfirepower.com/${page}`, {
      signal: AbortSignal.timeout(6500),
    });
    if (!response.ok) throw Error("MILITARY_PROVIDER_UNAVAILABLE");
    const html = await response.text();
    if (html.length > 3000000) throw Error("MILITARY_INVALID_RESPONSE");
    const values = parseMilitaryPage(html, key as keyof typeof militaryPages);
    if (values.size < 130) throw Error("MILITARY_INCOMPLETE");
    for (const [code, metric] of values) {
      edition ??= metric.year;
      if (metric.year !== edition) throw Error("MILITARY_MIXED_EDITIONS");
      const list = countries.get(code) ?? [];
      list.push(metric);
      countries.set(code, list);
    }
  }
  const complete = [...countries]
    .filter(
      ([, metrics]) => metrics.length === Object.keys(militaryPages).length,
    )
    .map(([code, metrics]) => ({ code, metrics }));
  if (complete.length < 130) throw Error("MILITARY_INCOMPLETE");
  return {
    version: 1,
    retrievedAt: new Date().toISOString(),
    countries: complete,
  };
}

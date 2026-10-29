import isoCountries from "i18n-iso-countries";
import { actorCountry } from "./countries";
import { normalizeText } from "./news-topics";
import type { CountryRef } from "../../shared/types/conflict";

const displays = ["en", "pt-BR", "es", "fr"].map(
  (locale) => new Intl.DisplayNames([locale], { type: "region" }),
);
const extra: Record<string, string[]> = {
  USA: ["United States", "U.S.", "USA", "Estados Unidos", "EUA"],
  GBR: ["Britain", "British", "United Kingdom", "Reino Unido"],
  RUS: ["Russia", "Russian", "Rússia", "russo", "russa"],
  UKR: ["Ukraine", "Ukrainian", "Ucrânia", "ucraniano", "ucraniana"],
  ISR: ["Israel", "Israeli", "israelense"],
  PSE: [
    "Palestine",
    "Palestinian",
    "Palestina",
    "palestino",
    "palestina",
    "Gaza",
    "Gaza Strip",
    "West Bank",
  ],
  IRN: ["Iran", "Iranian", "Irã", "iraniano"],
  CHN: ["China", "Chinese", "chinês", "chinesa"],
  PRK: [
    "North Korea",
    "North Korean",
    "Coreia do Norte",
    "N. Korea",
    "N.Korea",
  ],
  KOR: ["South Korea", "South Korean", "Coreia do Sul", "S. Korea", "S.Korea"],
  TUR: ["Turkey", "Turkish", "Türkiye", "Turquia"],
  SYR: ["Syria", "Syrian", "Síria"],
  RWA: ["Rwandan", "ruandês", "ruandesa"],
  SDN: ["Sudanese", "sudanês", "sudanesa"],
  ETH: ["Ethiopian", "etíope"],
  LBN: ["Lebanese", "libanês", "libanesa"],
  YEM: ["Yemeni", "iemenita"],
  IRQ: ["Iraqi", "iraquiano", "iraquiana"],
  PAK: ["Pakistani", "paquistanês", "paquistanesa"],
  CUB: ["Cuban", "cubano", "cubana"],
  QAT: ["Qatari", "catariano", "catariana"],
};
const entries = Object.entries(isoCountries.getAlpha3Codes()).map(
  ([code, alpha2]) => {
    const aliases = [
      ...new Set(
        [
          ...displays.map((display) => display.of(alpha2) ?? ""),
          ...(extra[code] ?? []),
        ]
          .map(normalizeText)
          .filter((name) => name.length > 2),
      ),
    ];
    const pattern = aliases
      .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .sort((a, b) => b.length - a.length)
      .join("|");
    return {
      code,
      aliases,
      pattern: new RegExp(
        `(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`,
        "gu",
      ),
    };
  },
);

export function headlineCountries(headline: string): CountryRef[] {
  const text = normalizeText(headline);
  const matches = entries.flatMap((entry) =>
    [...text.matchAll(entry.pattern)].map((match) => ({
      code: entry.code,
      start: match.index!,
      end: match.index! + match[0].length,
    })),
  );
  for (const [code, pattern] of [
    ["USA", /\bUS\b/g],
    ["GBR", /\bUK\b/g],
  ] as const)
    for (const match of headline.matchAll(pattern))
      matches.push({
        code,
        start: match.index!,
        end: match.index! + match[0].length,
      });
  matches.sort(
    (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
  );
  const kept: typeof matches = [];
  for (const match of matches)
    if (!kept.some((item) => match.start < item.end && match.end > item.start))
      kept.push(match);
  return [...new Set(kept.map((item) => item.code))]
    .map((code) => actorCountry(code)!)
    .filter(Boolean);
}

export function countryReference(locations: string, countries: CountryRef[]) {
  for (const country of countries) {
    const aliases =
      entries.find((entry) => entry.code === country.code)?.aliases ?? [];
    for (const location of locations.split(";")) {
      const fields = location.split("#");
      const lat = Number(fields[4]),
        lng = Number(fields[5]);
      if (
        fields[0] === "1" &&
        aliases.includes(normalizeText(fields[1] ?? "")) &&
        fields[4]?.trim() &&
        fields[5]?.trim() &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
      )
        return { country, coordinates: [lng, lat] as [number, number] };
    }
  }
  return null;
}

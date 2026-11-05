import isoCountries from "i18n-iso-countries";
import {
  metricDefinitions,
  type CountryDataset,
  type CountryProfile,
  type MetricKey,
} from "../../shared/types/country";
export interface WorldBankRow {
  indicator: { id: string };
  countryiso3code: string;
  date: string;
  value: number | null;
}
export function normalizeWorldBank(
  rows: WorldBankRow[],
  retrievedAt: string,
  sourceUpdatedAt: string,
): CountryDataset {
  const names = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  const countries = new Map<string, CountryProfile>();
  for (const [rawCode, alpha2] of Object.entries(
    isoCountries.getAlpha3Codes(),
  )) {
    const code = rawCode === "XKK" ? "KSV" : rawCode;
    countries.set(code, {
      code,
      alpha2,
      name: names.of(alpha2) ?? code,
      metrics: Object.keys(metricDefinitions).map((key) => ({
        key: key as MetricKey,
        points: [],
      })),
    });
  }
  for (const row of rows) {
    const key = (Object.keys(metricDefinitions) as MetricKey[]).find(
      (key) => metricDefinitions[key].indicator === row.indicator.id,
    );
    const country = countries.get(
      row.countryiso3code === "XKX" || row.countryiso3code === "XKK"
        ? "KSV"
        : row.countryiso3code,
    );
    if (
      !key ||
      !country ||
      row.value === null ||
      !Number.isFinite(row.value) ||
      !/^\d{4}$/.test(row.date)
    )
      continue;
    if (
      (key === "stability" && (row.value < 0 || row.value > 100)) ||
      (["population", "income"].includes(key) && row.value < 0)
    )
      continue;
    const points = country.metrics.find((metric) => metric.key === key)!.points;
    const point = { year: Number(row.date), value: row.value };
    const index = points.findIndex((item) => item.year === point.year);
    if (index >= 0) points[index] = point;
    else points.push(point);
  }
  for (const country of countries.values())
    for (const metric of country.metrics)
      metric.points.sort((a, b) => a.year - b.year);
  return {
    version: 1,
    retrievedAt,
    sourceUpdatedAt,
    countries: [...countries.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    ),
  };
}
export async function fetchWorldBank(): Promise<CountryDataset> {
  const end = new Date().getUTCFullYear() - 1;
  const indicators = Object.values(metricDefinitions)
    .map((metric) => metric.indicator)
    .join(";");
  const rows: WorldBankRow[] = [];
  let updated = "";
  const deadline = Date.now() + 40000;
  for (let page = 1; page <= 4; page++) {
    const url = `https://api.worldbank.org/v2/country/all/indicator/${indicators}?source=2&format=json&date=${end - 5}:${end}&per_page=20000&page=${page}`;
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw Error("WORLD_BANK_UNAVAILABLE");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(Math.min(12000, remaining)),
    });
    if (!response.ok) throw Error("WORLD_BANK_UNAVAILABLE");
    const data = (await response.json()) as [
      { pages: number; lastupdated: string },
      WorldBankRow[],
    ];
    if (
      !Array.isArray(data?.[1]) ||
      !Number.isFinite(data[0]?.pages) ||
      data[0].pages > 4
    )
      throw Error("WORLD_BANK_INVALID");
    rows.push(...data[1]);
    updated = data[0].lastupdated;
    if (page >= data[0].pages) break;
  }
  const dataset = normalizeWorldBank(rows, new Date().toISOString(), updated);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(updated) ||
    (Object.keys(metricDefinitions) as MetricKey[]).some(
      (key) =>
        dataset.countries.filter(
          (country) =>
            country.metrics.find((metric) => metric.key === key)?.points.length,
        ).length < 100,
    )
  )
    throw Error("WORLD_BANK_INCOMPLETE");
  return dataset;
}

export const metricDefinitions = {
  population: { indicator: "SP.POP.TOTL", label: "População", unit: "people" },
  income: {
    indicator: "NY.GDP.PCAP.CD",
    label: "PIB por habitante",
    unit: "usd",
  },
  growth: {
    indicator: "NY.GDP.MKTP.KD.ZG",
    label: "Crescimento do PIB",
    unit: "percent",
  },
  inflation: {
    indicator: "FP.CPI.TOTL.ZG",
    label: "Inflação anual",
    unit: "percent",
  },
  stability: {
    indicator: "GOV_WGI_PV_SC",
    label: "Estabilidade política",
    unit: "score",
  },
} as const;
export type MetricKey = keyof typeof metricDefinitions;
export interface MetricPoint {
  year: number;
  value: number;
}
export interface CountryMetric {
  key: MetricKey;
  points: MetricPoint[];
}
export interface CountryProfile {
  code: string;
  alpha2: string;
  name: string;
  metrics: CountryMetric[];
}
export interface CountryDataset {
  version: 1;
  retrievedAt: string;
  sourceUpdatedAt: string;
  countries: CountryProfile[];
}
export interface CountryObservation {
  code: string;
  day: string;
  observedAt: string;
  publications: number;
  stories: number;
  conflict: number;
  tension: number;
  diplomacy: number;
  economy: number;
  coverage: number;
  methodology: "news-observation-v1";
}
export interface CountryResponse {
  profile: CountryProfile;
  retrievedAt: string;
  sourceUpdatedAt: string;
  storage: "persistent" | "bundled";
  history: CountryObservation[];
  historyState: "ready" | "not-configured" | "unavailable";
}
export interface CountryCatalogItem {
  code: string;
  name: string;
  alpha2: string;
  stability: MetricPoint | null;
}
export interface CountryCatalog {
  countries: CountryCatalogItem[];
  retrievedAt: string;
  sourceUpdatedAt: string;
}

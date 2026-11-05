import bundled from "../data/country-statistics.json";
import type { CountryDataset } from "../../shared/types/country";
import { configuredRepository } from "./ingestion";
let cached:
  | { data: CountryDataset; storage: "persistent" | "bundled"; expires: number }
  | undefined;
export async function countryStatistics() {
  if (cached && cached.expires > Date.now()) return cached;
  const stored = await configuredRepository()
    .then((repository) => repository?.loadCountryDataset())
    .catch(() => null);
  cached = {
    data: (stored ?? bundled) as CountryDataset,
    storage: stored ? "persistent" : "bundled",
    expires: Date.now() + 60000,
  };
  return cached;
}
export function invalidateCountryStatistics() {
  cached = undefined;
}

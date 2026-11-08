import { militaryDataset } from "../../../services/military";
import type { MilitaryResponse } from "../../../../shared/types/military";
import { countryStatistics } from "../../../services/country-statistics";
export default defineEventHandler(async (event): Promise<MilitaryResponse> => {
  const code = getRouterParam(event, "code") ?? "";
  if (!/^[A-Z]{3}$/.test(code))
    throw createError({ statusCode: 400, statusMessage: "Invalid country" });
  const { data: dataset } = await countryStatistics();
  if (!dataset.countries.some((country) => country.code === code))
    throw createError({ statusCode: 404, statusMessage: "Unknown country" });
  const military = await militaryDataset();
  const metrics =
    military.countries.find((country) => country.code === code)?.metrics ?? [];
  setHeader(event, "Cache-Control", "public, max-age=3600");
  return {
    code,
    metrics,
    retrievedAt: military.retrievedAt,
    stale: Date.now() - Date.parse(military.retrievedAt) > 14 * 86400000,
    source: "Global Firepower",
    availability: metrics.length ? "available" : "not-covered",
  };
});

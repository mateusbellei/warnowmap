import { countryStatistics } from "../../services/country-statistics";
import { configuredRepository } from "../../services/ingestion";
import type { CountryResponse } from "../../../shared/types/country";
export default defineEventHandler(async (event): Promise<CountryResponse> => {
  const code = getRouterParam(event, "code")?.toUpperCase();
  if (!code || !/^[A-Z]{3}$/.test(code))
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid country code",
    });
  const { data, storage } = await countryStatistics();
  const profile = data.countries.find((country) => country.code === code);
  if (!profile)
    throw createError({ statusCode: 404, statusMessage: "Country not found" });
  const configured = !!(
    process.env.DATABASE_URL || process.env.WARNOW_SQLITE_PATH
  );
  let history: CountryResponse["history"] = [];
  let historyState: CountryResponse["historyState"] = configured
    ? "unavailable"
    : "not-configured";
  try {
    const repository = await configuredRepository();
    if (repository) {
      history = await repository.countryHistory(code);
      historyState = "ready";
    }
  } catch {}
  return {
    profile,
    retrievedAt: data.retrievedAt,
    sourceUpdatedAt: data.sourceUpdatedAt,
    storage,
    history,
    historyState,
  };
});

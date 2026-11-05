import { validIngestionToken } from "../../utils/ingestion-auth";
import { configuredRepository } from "../../services/ingestion";
import { fetchWorldBank } from "../../utils/world-bank";
import { invalidateCountryStatistics } from "../../services/country-statistics";
export default defineEventHandler(async (event) => {
  if (
    !validIngestionToken(
      getHeader(event, "authorization"),
      process.env.WARNOW_INGEST_SECRET,
    )
  )
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  const repository = await configuredRepository();
  if (!repository)
    throw createError({
      statusCode: 503,
      statusMessage: "Persistent repository required",
    });
  const dataset = await fetchWorldBank();
  await repository.saveCountryDataset(dataset);
  invalidateCountryStatistics();
  return {
    countries: dataset.countries.length,
    retrievedAt: dataset.retrievedAt,
  };
});

import { countryStatistics } from "../../services/country-statistics";
import { latestMetric } from "../../../shared/utils/country";
export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "public, max-age=300");
  const { data } = await countryStatistics();
  return {
    retrievedAt: data.retrievedAt,
    sourceUpdatedAt: data.sourceUpdatedAt,
    countries: data.countries.map((country) => {
      const point = latestMetric(
        country.metrics.find((metric) => metric.key === "stability"),
      );
      return {
        code: country.code,
        name: country.name,
        alpha2: country.alpha2,
        stability:
          point && point.year >= new Date().getUTCFullYear() - 3 ? point : null,
      };
    }),
  };
});

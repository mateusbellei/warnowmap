import { validIngestionToken } from "../../utils/ingestion-auth";
import { configuredRepository, runIngestion } from "../../services/ingestion";
export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
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
      statusMessage: "Persistent storage required",
    });
  try {
    return await runIngestion(repository);
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: "Ingestion unavailable; previous snapshot preserved",
    });
  }
});

import { configuredRepository } from "../services/ingestion";
export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  try {
    const repository = await configuredRepository();
    if (!repository)
      return {
        status: "limited",
        storage: "temporary",
        ingestion: "on-demand",
        message: "Histórico persistente e coleta externa ainda não ativados.",
      };
    const [feed, health] = await Promise.all([
      repository.load(),
      repository.health(),
    ]);
    const age = feed?.fetchedAt
      ? Date.now() - Date.parse(feed.fetchedAt)
      : Infinity;
    const ready =
      age < 3600000 &&
      feed?.mode === "live" &&
      !!feed.datasetAt &&
      Date.now() - Date.parse(feed.datasetAt) < 3600000 &&
      feed.coverage?.contextStatus === "complete";
    if (!ready) setResponseStatus(event, 503);
    return {
      status: ready ? "ready" : "degraded",
      storage: repository.kind,
      ingestion: "external",
      lastCollectedAt: feed?.fetchedAt ?? null,
      lastDatasetAt: feed?.datasetAt ?? null,
      contextStatus: feed?.coverage?.contextStatus ?? "pending",
      reports: health.reports,
      lastRun: health.lastRun
        ? {
            status: health.lastRun.status,
            endedAt: health.lastRun.endedAt,
            errorCode: health.lastRun.errorCode,
          }
        : null,
    };
  } catch {
    setResponseStatus(event, 503);
    return {
      status: "unavailable",
      message: "Repositório indisponível ou migrações pendentes.",
    };
  }
});

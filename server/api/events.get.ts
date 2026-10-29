import type { EventFeed } from "../../shared/types/conflict";
import { demoEvents } from "../data/demo";
import { selectEditorial } from "../utils/editorial";
import {
  groupOccurrences,
  presentPublications,
} from "../../shared/utils/occurrences";
import { eventsInPeriod, validPeriod } from "../../shared/utils/period";
import { collectFeed } from "../services/collector";
import { configuredRepository } from "../services/ingestion";
let pending: Promise<EventFeed> | undefined;
let cached: { expires: number; feed: EventFeed } | undefined;

export default defineEventHandler(async (event): Promise<EventFeed> => {
  setHeader(event, "Cache-Control", "no-store");
  const scope = getQuery(event).scope;
  const query = getQuery(event);
  const view = query.view === "reports" ? "reports" : "groups";
  const from = typeof query.from === "string" ? query.from : "";
  const to = typeof query.to === "string" ? query.to : "";
  if ((from || to) && !validPeriod(from, to))
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid period; use ISO dates, up to 90 days",
    });
  const present = (feed: EventFeed): EventFeed => {
    const selection =
      feed.mode === "demo"
        ? { events: feed.events, quality: undefined }
        : selectEditorial(feed.events);
    const occurrences =
      feed.mode === "demo"
        ? selection.events
        : groupOccurrences(selection.events);
    const periodReports =
      from && to
        ? eventsInPeriod(
            selection.events,
            from,
            to,
            query.basis === "collected" ? "collected" : "event",
          )
        : selection.events;
    const presented =
      feed.mode === "demo"
        ? periodReports
        : view === "reports"
          ? presentPublications(periodReports)
          : groupOccurrences(periodReports);
    return {
      ...feed,
      pipelineVersion: "monitor-v1",
      view,
      quality:
        feed.mode === "demo"
          ? undefined
          : {
              ...selection.quality!,
              evaluated: Math.max(
                feed.quality?.evaluated ?? 0,
                selection.quality!.evaluated,
              ),
              rejected:
                Math.max(
                  feed.quality?.evaluated ?? 0,
                  selection.quality!.evaluated,
                ) - selection.events.length,
            },
      summary: {
        reports: selection.events.length,
        occurrences: occurrences.length,
        dossiers: new Set(
          occurrences.map((item) => item.dossier?.id).filter(Boolean),
        ).size,
        policy: "conservative-v1",
      },
      operation: feed.operation ?? {
        ingestion: "on-demand",
        repository: "temporary",
        lastSuccessAt:
          feed.mode === "live" && feed.coverage?.contextStatus === "complete"
            ? feed.fetchedAt
            : null,
      },
      ...(feed.coverage
        ? {
            coverage: {
              ...feed.coverage,
              persistence:
                feed.operation?.repository === "postgres" ||
                feed.operation?.repository === "sqlite"
                  ? "persistent"
                  : process.env.VERCEL
                    ? "ephemeral"
                    : "persistent",
            },
          }
        : {}),
      events:
        scope === "bilateral" || scope === "state"
          ? presented.filter(
              (item) =>
                !!item.countryPair && (scope !== "state" || item.stateLinked),
            )
          : presented,
    };
  };
  const config = useRuntimeConfig(event);
  if (
    getQuery(event).demo === "true" ||
    String(config.gdeltEnabled) === "false"
  ) {
    return present({
      events: demoEvents,
      mode: "demo",
      fetchedAt: null,
      datasetAt: null,
      provider: "Demonstração",
      message:
        "Cenários ilustrativos para explorar a interface. Não representam incidentes ou a situação atual.",
    });
  }
  const repository = await configuredRepository().catch(() => {
    throw createError({
      statusCode: 503,
      statusMessage: "Persistent repository unavailable",
    });
  });
  if (repository) {
    const stored = await repository.load().catch(() => {
      throw createError({
        statusCode: 503,
        statusMessage: "Persistent repository unavailable",
      });
    });
    if (!stored)
      return present({
        events: [],
        mode: "unavailable",
        fetchedAt: null,
        datasetAt: null,
        provider: "GDELT 2.0",
        message:
          "Aguardando a primeira coleta programada. O histórico persistente está configurado.",
        operation: {
          ingestion: "external",
          repository: repository.kind,
          lastSuccessAt: null,
        },
      });
    const stale =
      !stored.fetchedAt || Date.now() - Date.parse(stored.fetchedAt) > 3600000;
    return present({
      ...stored,
      mode: stale ? "stale" : stored.mode,
      operation: {
        ingestion: "external",
        repository: repository.kind,
        lastSuccessAt: stored.operation?.lastSuccessAt ?? null,
      },
      coverage: stored.coverage
        ? { ...stored.coverage, persistence: "persistent" }
        : undefined,
    });
  }
  if (cached && cached.expires > Date.now()) return present(cached.feed);
  pending ??= collectFeed(useStorage("data"))
    .then((feed) => {
      cached = {
        feed,
        expires:
          Date.now() +
          (feed.mode === "unavailable" ||
          feed.coverage?.contextStatus === "partial"
            ? 60000
            : 300000),
      };
      return feed;
    })
    .finally(() => {
      pending = undefined;
    });
  return present(await pending);
});

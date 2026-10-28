import type { EventFeed } from "../../shared/types/conflict";
import { demoEvents } from "../data/demo";
import {
  decodeExport,
  exportCandidates,
  getExportUrl,
  parseGdeltExport,
} from "../utils/gdelt";
import { mergeHistory } from "../../shared/utils/timeline";
import { actorCountry } from "../utils/countries";
import { economicImpact } from "../../shared/utils/economy";

function normalizeCountryNames(feed: EventFeed | null) {
  if (feed)
    for (const event of feed.events) {
      event.economy = economicImpact(event.actionCode);
      event.countries = event.countries.map(
        (country) => actorCountry(country.code) ?? country,
      );
    }
  return feed;
}

// Uma consulta compartilhada por instância, independente dos filtros do cliente.
let pending: Promise<EventFeed> | undefined;
let cached: { expires: number; feed: EventFeed } | undefined;

async function loadFeed(): Promise<EventFeed> {
  const storage = useStorage("data");
  let stage = "manifest";
  try {
    const manifest = await $fetch<string>(
      "https://data.gdeltproject.org/gdeltv2/lastupdate.txt",
      { timeout: 8000, retry: 0, responseType: "text" },
    );
    let { date } = getExportUrl(manifest);
    date = new Date(date).toISOString();
    stage = "read-history";
    const previous = normalizeCountryNames(
      await storage.getItem<EventFeed>("events:v3:last"),
    );
    if (
      previous?.datasetAt === date &&
      previous.mode === "live" &&
      Date.now() - Date.parse(date) < 3600000
    )
      return previous;
    stage = "archive";
    let archive: ArrayBuffer | undefined;
    for (const candidate of exportCandidates(date)) {
      try {
        archive = await $fetch<ArrayBuffer>(candidate.url, {
          timeout: 3000,
          retry: 0,
          responseType: "arrayBuffer",
        });
        date = candidate.date;
        break;
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode !== 404) throw error;
      }
    }
    if (!archive)
      throw new Error("Nenhum lote publicado nas últimas três horas");
    if (archive.byteLength > 10_000_000)
      throw new Error("Arquivo muito grande");
    const batchDates = [
      ...new Set([
        ...(previous?.coverage?.batchDates ??
          (previous?.datasetAt ? [previous.datasetAt] : [])),
        date,
      ]),
    ]
      .filter(
        (value) =>
          Date.parse(value) >= Date.now() - 7 * 86400000 &&
          Date.parse(value) <= Date.now() + 900000,
      )
      .sort();
    stage = "decode";
    const feed: EventFeed = {
      events: mergeHistory(
        previous?.events ?? [],
        parseGdeltExport(decodeExport(new Uint8Array(archive))),
        Date.now(),
      ),
      mode: Date.now() - Date.parse(date) > 3600000 ? "stale" : "live",
      fetchedAt: new Date().toISOString(),
      datasetAt: date,
      message:
        "Relatos automáticos de confrontos e diplomacia. Histórico acumulado das coletas, com retenção de sete dias; não representa cobertura completa. Localizações aproximadas; sem revisão editorial.",
      provider: "GDELT 2.0",
      coverage: {
        firstCollectedAt: new Date(
          Math.max(
            Date.parse(
              previous?.coverage?.firstCollectedAt ?? new Date().toISOString(),
            ),
            Date.now() - 7 * 86400000,
          ),
        ).toISOString(),
        lastCollectedAt: new Date().toISOString(),
        batches: batchDates.length,
        retentionDays: 7,
        batchDates,
      },
    };
    stage = "persist";
    await storage.setItem("events:v3:last", feed);
    return feed;
  } catch (error) {
    const diagnostic = error as {
      name?: string;
      code?: string;
      statusCode?: number;
      cause?: { code?: string };
    };
    console.warn("GDELT: coleta indisponível", {
      stage,
      name: diagnostic?.name,
      code: diagnostic?.cause?.code ?? diagnostic?.code,
      status: diagnostic?.statusCode,
    });
    const previous = normalizeCountryNames(
      await storage.getItem<EventFeed>("events:v3:last").catch(() => null),
    );
    if (previous)
      return {
        ...previous,
        mode: "stale",
        message:
          "O provedor está indisponível. Exibindo a última coleta disponível; os dados podem estar desatualizados.",
      };
    return {
      events: [],
      mode: "unavailable",
      fetchedAt: null,
      datasetAt: null,
      message:
        "Não foi possível consultar o GDELT. Tente novamente ou explore o modo demonstração.",
      provider: "GDELT 2.0",
    };
  }
}

export default defineEventHandler(async (event): Promise<EventFeed> => {
  setHeader(event, "Cache-Control", "no-store");
  const scope = getQuery(event).scope;
  const present = (feed: EventFeed): EventFeed => ({
    ...feed,
    ...(feed.coverage
      ? {
          coverage: {
            ...feed.coverage,
            persistence: process.env.VERCEL ? "ephemeral" : "persistent",
          },
        }
      : {}),
    events:
      scope === "bilateral" || scope === "state"
        ? feed.events.filter(
            (item) =>
              !!item.countryPair && (scope !== "state" || item.stateLinked),
          )
        : feed.events,
  });
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
  if (cached && cached.expires > Date.now()) return present(cached.feed);
  pending ??= loadFeed()
    .then((feed) => {
      cached = {
        feed,
        expires: Date.now() + (feed.mode === "unavailable" ? 60000 : 300000),
      };
      return feed;
    })
    .finally(() => {
      pending = undefined;
    });
  return present(await pending);
});

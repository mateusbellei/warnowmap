import type { EventFeed } from "../../shared/types/conflict";
import {
  decodeExport,
  exportCandidates,
  getExportUrl,
  parseGdeltExport,
} from "../utils/gdelt";
import { mergeHistory } from "../../shared/utils/timeline";
import { actorCountry } from "../utils/countries";
import { economicImpact } from "../../shared/utils/economy";
import { explicitStateLink, selectEditorial } from "../utils/editorial";
import { decodeGkg, enrichContext, newsFromGkg } from "../utils/gkg";

function normalizeCountryNames(feed: EventFeed | null) {
  if (feed)
    for (const event of feed.events) {
      if (event.sourceType !== "article")
        event.economy = economicImpact(event.actionCode);
      event.stateLinked = explicitStateLink(event);
      event.countries = event.countries.map(
        (country) => actorCountry(country.code) ?? country,
      );
    }
  return feed;
}

export async function collectFeed(
  storage: FeedStorage,
  retentionDays = 7,
  budgetMs = 48000,
): Promise<EventFeed> {
  const deadline = Date.now() + budgetMs;
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
      await storage.getItem<EventFeed>("events:v4:last"),
    );
    if (
      previous?.datasetAt === date &&
      previous.mode === "live" &&
      previous.pipelineVersion === "news-v3" &&
      previous.coverage?.contextStatus === "complete" &&
      previous.events.every((item) => !!item.participants) &&
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
          Date.parse(value) >= Date.now() - retentionDays * 86400000 &&
          Date.parse(value) <= Date.now() + 900000,
      )
      .sort();
    stage = "decode";
    let incoming = parseGdeltExport(decodeExport(new Uint8Array(archive)));
    // GKG é uma fonte de notícias independente do número de extrações CAMEO.
    // Uma instância nova recupera até duas horas; duas transferências por vez.
    const completed = new Set(previous?.coverage?.contextBatchDates ?? []);
    const candidates = exportCandidates(date).slice(0, 8);
    const missing = candidates.filter((item) => !completed.has(item.date));
    for (let offset = 0; offset < missing.length; offset += 2) {
      if (Date.now() >= deadline) break;
      await Promise.all(
        missing.slice(offset, offset + 2).map(async (candidate) => {
          try {
            const url = candidate.url.replace(
              ".export.CSV.zip",
              ".gkg.csv.zip",
            );
            const options = () => ({
              timeout: Math.min(6000, Math.max(1, deadline - Date.now())),
              retry: 0,
              responseType: "arrayBuffer" as const,
            });
            let gkg: ArrayBuffer;
            try {
              gkg = await $fetch<ArrayBuffer>(url, options());
            } catch (error) {
              if (
                (error as { statusCode?: number }).statusCode !== 404 ||
                Date.now() >= deadline
              )
                throw error;
              // O CDN pode manter um 404 regional depois de o arquivo ser publicado.
              // Uma única revalidação com chave estável por cinco minutos, no mesmo host.
              gkg = await $fetch<ArrayBuffer>(
                `${url}?retry=${Math.floor(Date.now() / 300000)}`,
                options(),
              );
            }
            const text = decodeGkg(new Uint8Array(gkg));
            if (candidate.date === date)
              incoming = [
                ...incoming.filter((item) => item.sourceType === "article"),
                ...enrichContext(
                  incoming.filter((item) => item.sourceType !== "article"),
                  text,
                ),
              ];
            incoming.push(...newsFromGkg(text));
            completed.add(candidate.date);
          } catch (error) {
            const diagnostic = error as {
              name?: string;
              statusCode?: number;
              message?: string;
            };
            console.warn("GDELT: falha de contexto", {
              batch: candidate.date,
              name: diagnostic.name,
              status: diagnostic.statusCode,
              reason: diagnostic.message?.slice(0, 180),
            });
          }
        }),
      );
    }
    const contextDates = [...completed]
      .filter(
        (value) => Date.parse(value) >= Date.now() - retentionDays * 86400000,
      )
      .sort();
    const incomplete = candidates.some((item) => !completed.has(item.date));
    const collectedDates = [
      ...new Set([...batchDates, ...contextDates]),
    ].sort();
    const currentContext = completed.has(date);
    const merged = mergeHistory(
      previous?.events ?? [],
      incoming,
      Date.now(),
      retentionDays,
    );
    const before = new Map(previous?.events.map((item) => [item.id, item]));
    const observedAt = new Date().toISOString();
    for (const item of merged) {
      const earlier = before.get(item.id);
      item.firstSeenAt = earlier?.firstSeenAt ?? item.firstSeenAt ?? observedAt;
      item.lastSeenAt =
        earlier && earlier.title === item.title
          ? (earlier.lastSeenAt ?? observedAt)
          : observedAt;
    }
    const feed: EventFeed = {
      pipelineVersion: "news-v3",
      events: merged,
      mode: !currentContext
        ? selectEditorial(merged).events.length
          ? "stale"
          : "unavailable"
        : Date.now() - Date.parse(date) > 3600000
          ? "stale"
          : "live",
      fetchedAt: new Date().toISOString(),
      datasetAt: date,
      message: incomplete
        ? "Coleta de contexto incompleta. Exibindo apenas notícias com contexto disponível; novas tentativas automáticas em um minuto. Poucos relatos não significam ausência de conflitos."
        : "Notícias selecionadas por manchete, temas e evidências estruturadas. Janela inicial de até duas horas, com histórico das coletas retido por sete dias; cobertura parcial, sem revisão editorial.",
      provider: "GDELT 2.0",
      coverage: {
        firstCollectedAt: new Date(
          Math.max(
            Date.parse(
              previous?.coverage?.firstCollectedAt ?? new Date().toISOString(),
            ),
            Date.now() - retentionDays * 86400000,
          ),
        ).toISOString(),
        lastCollectedAt: new Date().toISOString(),
        batches: collectedDates.length,
        retentionDays,
        batchDates: collectedDates,
        contextBatchDates: contextDates,
        contextStatus: incomplete ? "partial" : "complete",
      },
    };
    stage = "persist";
    await storage.setItem("events:v4:last", feed);
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
      await storage.getItem<EventFeed>("events:v4:last").catch(() => null),
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

export interface FeedStorage {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
}

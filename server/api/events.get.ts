import type { EventFeed } from "../../shared/types/conflict";
import { demoEvents } from "../data/demo";
import { decodeExport, getExportUrl, parseGdeltExport } from "../utils/gdelt";

// Uma consulta compartilhada por instância, independente dos filtros do cliente.
let pending: Promise<EventFeed> | undefined;
let cached: { expires: number; feed: EventFeed } | undefined;

async function loadFeed(): Promise<EventFeed> {
  const storage = useStorage("data");
  try {
    const manifest = await $fetch<string>(
      "https://data.gdeltproject.org/gdeltv2/lastupdate.txt",
      { timeout: 12000, retry: 1, responseType: "text" },
    );
    const { url, date } = getExportUrl(manifest);
    const previous = await storage.getItem<EventFeed>("events:v2:last");
    if (
      previous?.datasetAt === date &&
      previous.mode === "live" &&
      Date.now() - Date.parse(date) < 3600000
    )
      return previous;
    const archive = await $fetch<ArrayBuffer>(url, {
      timeout: 20000,
      retry: 1,
      responseType: "arrayBuffer",
    });
    if (archive.byteLength > 10_000_000)
      throw new Error("Arquivo muito grande");
    const feed: EventFeed = {
      events: parseGdeltExport(decodeExport(new Uint8Array(archive))),
      mode: Date.now() - Date.parse(date) > 3600000 ? "stale" : "live",
      fetchedAt: new Date().toISOString(),
      datasetAt: date,
      message:
        "Relatos extraídos automaticamente de notícias. Localização aproximada; sem verificação editorial. Último lote de 15 minutos, não o total mundial.",
      provider: "GDELT 2.0",
    };
    await storage.setItem("events:v2:last", feed);
    return feed;
  } catch {
    const previous = await storage
      .getItem<EventFeed>("events:v2:last")
      .catch(() => null);
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
  const config = useRuntimeConfig(event);
  if (
    getQuery(event).demo === "true" ||
    String(config.gdeltEnabled) === "false"
  ) {
    return {
      events: demoEvents,
      mode: "demo",
      fetchedAt: null,
      datasetAt: null,
      provider: "Demonstração",
      message:
        "Cenários ilustrativos para explorar a interface. Não representam incidentes ou a situação atual.",
    };
  }
  if (cached && cached.expires > Date.now()) return cached.feed;
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
  return pending;
});
